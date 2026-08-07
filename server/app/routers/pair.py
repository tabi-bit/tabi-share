"""デバイス間引き継ぎ用のペアリングコード発行・引き換え (issue #194)。

iOS のホーム画面追加アプリは Safari とストレージが分離され、OAuth リダイレクトも常に
Safari 側で開かれるため、Google 認証によるリカバリが機能しない。この抜け穴を
「認証済みデバイス → 8 桁コード発行 → 受信側デバイスでコード入力 → Firebase
Custom Token 経由で認証状態を移送」のペアリング機構で塞ぐ。

コード ↔ Custom Token のマッピングは Firestore に短命保存する (5 分、one-time)。
Custom Token 自体は 700 文字超あり QR で扱いにくいので、8 桁コード表面 + 実体を
Firestore に隠す設計。

セキュリティ:
- コード空間 = 32^8 ≈ 1 兆 (40 bits)。SMS の 6 桁 OTP (20 bits) より強い
- 5 分 TTL + one-time consume (Firestore transaction で atomic)
- Firestore TTL policy で expires_at 経過ドキュメントは自動削除

`firebase_admin` / `google-cloud-firestore` の API はいずれも同期ブロッキング I/O
(特に `create_custom_token` は IAM signBlob への HTTP 呼び出しを伴う) なので、
コルーチンから直接呼ばず `run_in_threadpool` 経由で実行しイベントループを止めない。
"""

import logging
import secrets
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from firebase_admin import auth as fb_auth
from firebase_admin import firestore
from firebase_admin.exceptions import FirebaseError
from google.cloud.exceptions import Conflict
from google.cloud.firestore import Client, Transaction, transactional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.auth import ensure_session
from app.db_connection import get_db_session
from app.errors import Forbidden, NotFound
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Pair"], prefix="/pair")

FIRESTORE_COLLECTION = "pairing_codes"
# 紛らわしい文字 (0/O, 1/I/L) を除いた 31 文字。表示上は 4 桁ずつハイフンで区切るが、
# 保存・照合はハイフンを除いた素のコードで行う (_normalize_code 参照)。
_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"
_CODE_LENGTH = 8
_CODE_TTL_MINUTES = 5
# コード衝突時に採番し直す上限。空間が 31^8 なので通常 1 回で成功する
_CODE_CREATE_MAX_ATTEMPTS = 5


class CreatePairingOut(BaseModel):
    code: str
    expires_at: datetime


class RedeemPairingIn(BaseModel):
    code: str


class RedeemPairingOut(BaseModel):
    custom_token: str


def _generate_code() -> str:
    """`secrets.choice` を使った暗号学的乱数由来の 8 桁コードを生成"""
    return "".join(secrets.choice(_CODE_ALPHABET) for _ in range(_CODE_LENGTH))


def _normalize_code(raw: str) -> str:
    """入力コードを正規化する。

    大文字化した上で、コード用アルファベットに含まれない文字 (ハイフン・空白等) を落とす。
    UI は `A9K3-P2Q7` のように 4 桁ずつ区切って表示するため、画面の見た目通りに入力しても
    引き換えできるようにする。
    """
    return "".join(c for c in raw.upper() if c in _CODE_ALPHABET)


def _firestore_client() -> Client:
    """Firestore クライアントを取得する。

    `init_firebase_admin` が初期化を skip している場合 (`NOTIFICATIONS_ENABLED=false` 等)
    default app が無く `ValueError` になる。設定不備であることが伝わるよう 503 に変換する。
    """
    try:
        return firestore.client()
    except ValueError as e:
        logger.exception("Firestore is unavailable (Firebase Admin is not initialized)")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "デバイス引き継ぎ機能が利用できません。"
                "サーバーの Firebase 設定を確認してください。"
            ),
        ) from e


@router.post(
    "/create",
    summary="デバイス引き継ぎ用のペアリングコードを発行する",
    operation_id="pair-create",
    response_model=CreatePairingOut,
)
async def create_pairing(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CreatePairingOut:
    """認証済み (`firebase_uid` あり) user 用に 8 桁コードを発行する。

    Firestore に `{code, custom_token, expires_at, consumed_at: null}` を保存し、
    表示用のコードだけを返す。Custom Token は受信側の /pair/redeem で交換する。
    """
    session = await ensure_session(request, response, db)
    user = await db.get(User, session.user_id)
    if user is None or user.firebase_uid is None:
        raise Forbidden(message="ログインが必要です")

    try:
        custom_token_bytes: bytes = await run_in_threadpool(
            fb_auth.create_custom_token, user.firebase_uid
        )
    except FirebaseError as e:
        logger.exception("failed to create custom token (FirebaseError)")
        raise Forbidden(message="Custom Token の発行に失敗しました") from e
    except ValueError as e:
        # 署名用 SA credentials が使えない (ローカル ADC で signBlob 権限が無い等)
        logger.exception("failed to create custom token (signing not available)")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Custom Token の署名に失敗しました。"
                "サーバーの Firebase Admin 設定 (SA の signBlob 権限) を確認してください。"
            ),
        ) from e

    client = _firestore_client()
    expires_at = datetime.now(UTC) + timedelta(minutes=_CODE_TTL_MINUTES)
    document = {
        "custom_token": custom_token_bytes.decode(),
        "expires_at": expires_at,
        "consumed_at": None,
    }
    # set() は既存ドキュメントを置換するため、コードが衝突すると発行済みで未使用の
    # コードの custom_token を別 user のもので上書きしてしまう (先のコードの持ち主が
    # 別 user として認証されうる)。create() で既存を壊さないようにし、衝突したら採番し直す。
    for _ in range(_CODE_CREATE_MAX_ATTEMPTS):
        code = _generate_code()
        doc_ref = client.collection(FIRESTORE_COLLECTION).document(code)
        try:
            await run_in_threadpool(doc_ref.create, document)
        except Conflict:
            logger.warning("pairing code collided, regenerating")
            continue
        return CreatePairingOut(code=code, expires_at=expires_at)

    logger.error("failed to allocate a unique pairing code")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="引き継ぎコードを発行できませんでした。時間をおいて再度お試しください。",
    )


@router.post(
    "/redeem",
    summary="ペアリングコードを引き換えて Custom Token を取得する",
    operation_id="pair-redeem",
    response_model=RedeemPairingOut,
)
async def redeem_pairing(body: RedeemPairingIn) -> RedeemPairingOut:
    """受信側デバイス (匿名でも可) がコードを引き換え Custom Token を受け取る。

    Firestore トランザクションで期限・消費済みチェック + `consumed_at` 更新を
    atomic に実行し、同一コードの二重使用を防止する。
    """
    code = _normalize_code(body.code)
    if not code:
        # 正規化後に空になる入力 (記号のみ等)。Firestore は空 ID を受け付けないため先に弾く
        raise NotFound(message="コードが無効です")

    client = _firestore_client()
    doc_ref = client.collection(FIRESTORE_COLLECTION).document(code)
    transaction = client.transaction()

    @transactional
    def _consume(tx: Transaction) -> str:
        snapshot = doc_ref.get(transaction=tx)
        if not snapshot.exists:
            raise NotFound(message="コードが無効です")
        data = snapshot.to_dict() or {}
        expires_at = data.get("expires_at")
        if expires_at is not None and expires_at < datetime.now(UTC):
            raise Forbidden(message="コードの有効期限が切れています")
        if data.get("consumed_at") is not None:
            raise Forbidden(message="このコードは既に使用されています")
        tx.update(doc_ref, {"consumed_at": datetime.now(UTC)})
        token = data.get("custom_token")
        if not isinstance(token, str):
            # 想定外 (create 側で必ず str が入るはず)
            raise Forbidden(message="コードデータが不正です")
        return token

    custom_token: str = await run_in_threadpool(_consume, transaction)
    return RedeemPairingOut(custom_token=custom_token)
