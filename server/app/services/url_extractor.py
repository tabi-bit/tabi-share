"""URL ストック向けのバックエンドサービス

役割を 2 つに分ける:
1. **URL メタデータ取得** (`extract_url_metadata`): URL から title / og:image を取得
2. **AI 整形** (`format_text_with_gemini`): ユーザーが貼り付けたテキスト + 指示を Gemini で
   markdown に整形する
"""

import json
import logging
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Final

import httpx
import trafilatura
from fastapi.concurrency import run_in_threadpool
from google import genai
from google.genai import types as genai_types

from app.config import get_settings
from app.schemas.trip_url import TripUrlPreview

logger = logging.getLogger(__name__)

FETCH_TIMEOUT_SECONDS: Final[float] = 5.0
MAX_RESPONSE_BYTES: Final[int] = 1_000_000  # 1MB
GEMINI_INPUT_MAX_CHARS: Final[int] = 12_000

# 開発環境での Gemini デバッグログ出力先
GEMINI_DEBUG_LOG_DIR: Final[Path] = Path("/tmp/tabishare-gemini-debug")

USER_AGENT: Final[str] = (
    "Mozilla/5.0 (compatible; tabishare-url-stock/0.1; +https://tabishare.net)"
)

DEFAULT_INTENT: Final[str] = "サマリ"

FORMAT_SYSTEM_PROMPT: Final[str] = (
    "あなたは旅行計画メモのアシスタントです。"
    "ユーザーから「整形対象テキスト」と「指示」を受け取り、"
    "GitHub Flavored Markdown 形式で整形して返してください。\n\n"
    "出力ルール:\n"
    "- 出力は素の Markdown 本文のみ。コードフェンス（```）や前置き・後書きは付けない\n"
    "- 見出し（# / ##）は使わない（メモに埋め込まれるため）。"
    "代わりに `**強調**` で小見出し的に区切ってよい\n"
    "- 価格・営業時間・住所・プラン情報など複数項目があれば箇条書き（`- `）"
    "または markdown 表（`|`）で構造化する\n"
    "- 整形対象テキストに書かれていない情報は推測で補わない。情報が不足していれば省く\n"
    "- 指示が空欄または「サマリ」の場合は、冒頭に概要 1〜2 行 + 重要点を箇条書きで列挙する\n"
    "- 出力言語は整形対象に合わせる（日本語が主体なら日本語）"
)


# ---------------------------------------------------------------------------
# URL メタデータ取得
# ---------------------------------------------------------------------------


async def _fetch_html(url: str) -> str | None:
    """URL を fetch して HTML 文字列を返す。失敗時は None"""
    try:
        async with httpx.AsyncClient(
            timeout=FETCH_TIMEOUT_SECONDS,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT, "Accept-Language": "ja,en;q=0.8"},
        ) as client:
            async with client.stream("GET", url) as response:
                response.raise_for_status()
                content_type = response.headers.get("content-type", "")
                if "html" not in content_type.lower():
                    return None
                chunks: list[bytes] = []
                total = 0
                async for chunk in response.aiter_bytes():
                    chunks.append(chunk)
                    total += len(chunk)
                    if total >= MAX_RESPONSE_BYTES:
                        break
                return b"".join(chunks).decode(
                    response.encoding or "utf-8", errors="replace"
                )
    except (httpx.HTTPError, UnicodeDecodeError) as exc:
        logger.info("URL メタデータの fetch に失敗しました: url=%s err=%s", url, exc)
        return None


def _extract_metadata(html: str) -> tuple[str | None, str | None]:
    """trafilatura のメタデータ抽出で title と og:image を取得する"""
    metadata = trafilatura.extract_metadata(html)
    if metadata is None:
        return None, None
    title = metadata.title or None
    image = metadata.image or None
    return title, image


async def extract_url_metadata(url: str) -> TripUrlPreview:
    """URL を fetch してメタデータ（title / og:image）だけを返す。

    fetch 失敗・メタ抽出失敗のいずれの場合も致命的にせず None を埋めて返す。
    本文要約は行わない（AI 整形は別エンドポイントで明示的に呼ぶ）。
    """
    html = await _fetch_html(url)
    if html is None:
        return TripUrlPreview(title=None, thumbnail_url=None)

    title, thumbnail_url = await run_in_threadpool(_extract_metadata, html)
    return TripUrlPreview(title=title, thumbnail_url=thumbnail_url)


# ---------------------------------------------------------------------------
# AI 整形（Gemini）
# ---------------------------------------------------------------------------


def _serialize_for_debug(value: Any) -> Any:
    """Gemini レスポンス等をデバッグログ用に JSON-safe な値へ変換する"""
    if value is None or isinstance(value, str | int | float | bool):
        return value
    # pydantic v2 モデル（google-genai のレスポンス型）
    if hasattr(value, "model_dump"):
        try:
            return value.model_dump(mode="json")
        except Exception:
            pass
    if isinstance(value, list | tuple):
        return [_serialize_for_debug(v) for v in value]
    if isinstance(value, dict):
        return {k: _serialize_for_debug(v) for k, v in value.items()}
    return repr(value)


def _write_gemini_debug_log(payload: dict[str, Any]) -> Path | None:
    """Gemini 呼び出しのリクエスト/レスポンスを開発環境でファイル出力する。

    本番・ステージングでは何もしない（個人情報や API レスポンスをディスクに残さないため）。
    成功時はファイルパスを返す。
    """
    settings = get_settings()
    if settings.environment != "development":
        return None
    try:
        GEMINI_DEBUG_LOG_DIR.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        rid = uuid.uuid4().hex[:8]
        path = GEMINI_DEBUG_LOG_DIR / f"{ts}_{rid}.json"
        path.write_text(
            json.dumps(_serialize_for_debug(payload), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        return path
    except OSError as exc:
        logger.warning("Gemini デバッグログの書き込みに失敗: err=%s", exc)
        return None


def _build_format_user_message(source_text: str, intent: str | None) -> str:
    """Gemini に渡す user メッセージ（整形対象 + 指示）を組み立てる"""
    effective_intent = (intent or "").strip() or DEFAULT_INTENT
    truncated = source_text[:GEMINI_INPUT_MAX_CHARS]
    return f"# 指示\n{effective_intent}\n\n# 整形対象テキスト\n{truncated}"


async def format_text_with_gemini(source_text: str, intent: str | None) -> str | None:
    """ユーザーが貼り付けたテキストを Gemini で markdown 整形する。

    API キー未設定または呼び出し失敗時は None を返す（呼び出し側で 502 等を投げる）。
    """
    settings = get_settings()
    api_key = settings.gemini_api_key
    if not api_key:
        return None

    user_message = _build_format_user_message(source_text, intent)
    config = genai_types.GenerateContentConfig(
        system_instruction=FORMAT_SYSTEM_PROMPT,
        temperature=0.4,
        max_output_tokens=1200,
    )
    request_payload: dict[str, Any] = {
        "model": settings.gemini_model,
        "system_instruction": FORMAT_SYSTEM_PROMPT,
        "contents": user_message,
        "config": config,
        "input_chars": len(source_text),
        "input_truncated": len(source_text) > GEMINI_INPUT_MAX_CHARS,
        "intent": intent,
    }

    try:
        client = genai.Client(api_key=api_key)
        response = await client.aio.models.generate_content(
            model=settings.gemini_model,
            contents=user_message,
            config=config,
        )
        formatted = (response.text or "").strip()
        log_path = _write_gemini_debug_log(
            {
                "request": request_payload,
                "response": response,
                "formatted": formatted,
            }
        )
        if log_path is not None:
            logger.info("Gemini debug log: %s", log_path)
        return formatted or None
    except Exception as exc:  # SDK が投げる例外は多岐に渡るため広めに捕捉
        log_path = _write_gemini_debug_log(
            {
                "request": request_payload,
                "error": {"type": type(exc).__name__, "message": str(exc)},
            }
        )
        if log_path is not None:
            logger.info("Gemini debug log: %s", log_path)
        logger.warning("Gemini 整形に失敗しました: err=%s", exc)
        return None


__all__ = ["extract_url_metadata", "format_text_with_gemini"]
