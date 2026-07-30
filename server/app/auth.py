"""
認証・認可モジュール（セッションキー方式）

- Basic 認証: APIドキュメントや管理系エンドポイントの保護
- セッション認可: 不透明トークン session_id を JWT に載せた HttpOnly Cookie を発行し、
  DB の user_trip_access テーブルで認可判定する。並列付与の race は
  (user_id, trip_id) 複合 PK と ON CONFLICT DO NOTHING で idempotent に解消される。
"""

import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated, Literal
from urllib.parse import urlparse

import jwt
from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from sqlalchemy import exists, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db_connection import get_db_session
from app.errors import Forbidden, NotFound
from app.models import Block, Page, User, UserSession, UserTripAccess

# ---- Basic 認証 ----


def require_basic_auth(
    credentials: Annotated[HTTPBasicCredentials, Depends(HTTPBasic())],
) -> None:
    """Basic 認証で保護する。APIドキュメントや管理系エンドポイントで使用。"""
    settings = get_settings()
    valid_username = secrets.compare_digest(
        credentials.username.encode(), settings.api_docs_username.encode()
    )
    valid_password = secrets.compare_digest(
        credentials.password.encode(), settings.api_docs_password.encode()
    )
    if not (valid_username and valid_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="認証に失敗しました",
            headers={"WWW-Authenticate": "Basic"},
        )


SESSION_COOKIE_NAME = "tabishare_session"
# secrets.token_urlsafe(24) は 32 文字。DB カラム String(32) と一致。
_SESSION_ID_BYTES = 24


def decode_session_id(request: Request) -> str | None:
    """Cookie の JWT から session_id を取り出す。Cookie 無・不正・期限切れなら None。

    移行ミドルウェアからも参照できるよう public。旧形式 (payload に trip_ids
    フィールドがある) の JWT はここで None 扱いになるため、ミドルウェア側で
    別途 payload を検査して移行する必要がある。
    """
    raw = request.cookies.get(SESSION_COOKIE_NAME)
    if not raw:
        return None
    settings = get_settings()
    try:
        payload = jwt.decode(raw, settings.cookie_secret_key, algorithms=["HS256"])
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
        return None
    sid = payload.get("session_id")
    return sid if isinstance(sid, str) else None


def _resolve_samesite(request: Request, is_production: bool) -> Literal["lax", "none"]:
    """リクエスト元 Origin から適切な SameSite 値を選ぶ。

    - `st.tabishare.net` 等 `tabishare.net` 配下からのアクセスは same-site なので `Lax`。
      Safari の ITP でも first-party 扱いとなり cookie が送信される。
    - Firebase Hosting プレビュー (`*.web.app`) 等の cross-site origin からは `None` に
      フォールバックする (`Secure` 前提)。Safari は third-party として扱いブロックするが、
      Chrome ではプレビュー動作確認が可能になる。
    """
    if not is_production:
        return "lax"
    origin_host = urlparse(request.headers.get("origin", "")).hostname or ""
    if origin_host == "tabishare.net" or origin_host.endswith(".tabishare.net"):
        return "lax"
    return "none"


def encode_session_jwt(session_id: str) -> str:
    """session_id を含む新形式 JWT を生成する。移行ミドルウェアと共用するため public。"""
    settings = get_settings()
    payload = {
        "session_id": session_id,
        "exp": datetime.now(UTC) + timedelta(seconds=settings.cookie_max_age),
    }
    return jwt.encode(payload, settings.cookie_secret_key, algorithm="HS256")


def set_session_cookie(request: Request, response: Response, session_id: str) -> None:
    """session_id を JWT に載せた HttpOnly Cookie を発行する。

    既存 session に対して呼び直すことで Max-Age がリセットされ、Cookie の
    30 日ローリング更新として機能する (認可済みリクエストでこれを呼ぶ)。
    """
    settings = get_settings()
    token = encode_session_jwt(session_id)

    is_production = settings.environment != "development"
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=settings.cookie_max_age,
        httponly=True,
        secure=is_production,
        samesite=_resolve_samesite(request, is_production),
        path="/",
    )


def generate_session_id() -> str:
    """新規 session_id (URL-safe な 32 文字トークン) を生成する。"""
    return secrets.token_urlsafe(_SESSION_ID_BYTES)


async def ensure_session(
    request: Request, response: Response, db: AsyncSession
) -> UserSession:
    """現在の session を取得または新規発行する。

    - 有効な Cookie がある場合: 既存 session を返しつつ Cookie を再発行 (30 日ローリング)
      し、`last_seen_at` を更新する
    - Cookie 未発行 / 無効 / DB に session が存在しない場合: 匿名 user と session を新規発行

    `routers/auth.py` の `POST /auth/link` からも参照するため public。
    """
    session_id = decode_session_id(request)
    if session_id is not None:
        existing = await db.get(UserSession, session_id)
        if existing is not None:
            existing.last_seen_at = datetime.now(UTC)
            set_session_cookie(request, response, existing.id)
            return existing
    # Cookie 無 or DB に存在しない → 匿名 user + session を新規発行
    user = User()
    db.add(user)
    await db.flush()
    session = UserSession(id=generate_session_id(), user_id=user.id)
    db.add(session)
    await db.flush()
    set_session_cookie(request, response, session.id)
    return session


async def grant_trip_access(
    request: Request,
    response: Response,
    trip_id: int,
    db: AsyncSession,
) -> None:
    """指定 trip_id へのアクセス権を現在の user に付与する。

    Cookie が無ければ匿名 user と session を先に発行する。並列付与の race は
    (user_id, trip_id) の UNIQUE 制約と ON CONFLICT DO NOTHING で idempotent に解消される。
    プロジェクトの CRUD 慣習に合わせ、変更完了時に commit する。
    """
    session = await ensure_session(request, response, db)
    await db.execute(
        pg_insert(UserTripAccess)
        .values(user_id=session.user_id, trip_id=trip_id)
        .on_conflict_do_nothing(index_elements=["user_id", "trip_id"])
    )
    await db.commit()


async def _has_trip_access(
    db: AsyncSession, session_id: str | None, trip_id: int
) -> bool:
    """session_id が指す user が trip_id にアクセスできるかを判定する。"""
    if session_id is None:
        return False
    stmt = select(
        exists().where(
            UserSession.id == session_id,
            UserTripAccess.user_id == UserSession.user_id,
            UserTripAccess.trip_id == trip_id,
        )
    )
    result = await db.execute(stmt)
    return bool(result.scalar())


# ---- FastAPI Depends 用の認可関数 ----


async def require_trip_access(
    trip_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db_session),
) -> int:
    """パスパラメータの trip_id へのアクセス権を検証する。"""
    if not await _has_trip_access(db, decode_session_id(request), trip_id):
        raise Forbidden()
    return trip_id


async def require_page_access(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    page_id: int,
    request: Request,
) -> int:
    """page_id から trip_id を解決し、アクセス権を検証する。

    trip_id 解決と権限判定を JOIN 1 発で行う (ページ・ブロック CRUD は最頻出
    エンドポイントのため、認可の DB 往復数を最小化する)。
    """
    session_id = decode_session_id(request)
    stmt = select(
        Page.trip_id,
        exists()
        .where(
            UserSession.id == session_id,
            UserTripAccess.user_id == UserSession.user_id,
            UserTripAccess.trip_id == Page.trip_id,
        )
        .label("has_access"),
    ).where(Page.id == page_id)
    row = (await db.execute(stmt)).one_or_none()
    if row is None:
        raise NotFound(message="Page not found")
    if not row.has_access:
        raise Forbidden()
    return row.trip_id


async def require_block_access(
    db: Annotated[AsyncSession, Depends(get_db_session)],
    block_id: int,
    request: Request,
) -> int:
    """block_id から trip_id を解決し、アクセス権を検証する。JOIN 1 発。"""
    session_id = decode_session_id(request)
    stmt = (
        select(
            Page.trip_id,
            exists()
            .where(
                UserSession.id == session_id,
                UserTripAccess.user_id == UserSession.user_id,
                UserTripAccess.trip_id == Page.trip_id,
            )
            .label("has_access"),
        )
        .join(Block, Block.page_id == Page.id)
        .where(Block.id == block_id)
    )
    row = (await db.execute(stmt)).one_or_none()
    if row is None:
        raise NotFound(message="Block not found")
    if not row.has_access:
        raise Forbidden()
    return row.trip_id
