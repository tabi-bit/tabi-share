"""デバイス間引き継ぎ用のペアリングコード発行・引き換え (issue #194)。

iOS のホーム画面追加アプリは Safari とストレージが分離され、OAuth リダイレクトも常に
Safari 側で開かれるため、Google 認証によるリカバリが機能しない。この抜け穴を
「認証済みデバイス → 8 桁コード発行 → 受信側デバイスでコード入力 → Firebase
Custom Token 経由で認証状態を移送」のペアリング機構で塞ぐ。

コード ↔ firebase_uid のマッピングは Firestore に短命保存し (5 分、one-time)、
Custom Token は引き換え時に発行する。

セキュリティ:
- コード空間 = 31^8 ≈ 8.5 千億 (約 40 bits)。SMS の 6 桁 OTP (20 bits) より強い
- 5 分 TTL + one-time consume (Firestore transaction で atomic)
- Firestore TTL policy で expires_at 経過ドキュメントは自動削除
- Firestore にはログインに使える Custom Token もコードそのものも置かない。ドキュメント ID は
  サーバーの秘密鍵で計算した HMAC なので、Firestore を読めてもコードを引き換えられない
  (issue #242)
- 発行・引き換えとも接続元 IP 単位でレート制限する

`firebase_admin` / `google-cloud-firestore` の API はいずれも同期ブロッキング I/O
(特に `create_custom_token` は IAM signBlob への HTTP 呼び出しを伴う) なので、
コルーチンから直接呼ばず `run_in_threadpool` 経由で実行しイベントループを止めない。
"""

import hashlib
import hmac
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
from app.config import get_settings
from app.db_connection import get_db_session
from app.errors import Forbidden, NotFound
from app.models import User
from app.rate_limit import RateLimiter

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
# 「存在しない・期限切れ・使用済み」を区別すると、総当たりの手がかりになるため 1 種類にまとめる
_INVALID_CODE_MESSAGE = (
    "コードが無効です。有効期限 (5 分) が切れていないか確認してください"
)

_create_limiter = RateLimiter(limit=5, window_seconds=60)
_redeem_limiter = RateLimiter(limit=10, window_seconds=60)


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


def _document_id(code: str) -> str:
    """コードに対応する Firestore のドキュメント ID (サーバーの秘密鍵による HMAC)。"""
    key = get_settings().cookie_secret_key.encode()
    return hmac.new(key, f"pairing-code:{code}".encode(), hashlib.sha256).hexdigest()


def _firestore_client() -> Client:
    """Firestore クライアントを取得する。

    `init_firebase_admin` が初期化に失敗している場合は default app が無く `ValueError` になる。
    設定不備であることが伝わるよう 503 に変換する。
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
    dependencies=[Depends(_create_limiter.dependency())],
)
async def create_pairing(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> CreatePairingOut:
    """認証済み (`firebase_uid` あり) user 用に 8 桁コードを発行する。

    Firestore に `{firebase_uid, expires_at, consumed_at: null}` を保存し、
    表示用のコードだけを返す。Custom Token は受信側の /pair/redeem で発行する。
    """
    session = await ensure_session(request, response, db)
    user = await db.get(User, session.user_id)
    if user is None or user.firebase_uid is None:
        raise Forbidden(message="ログインが必要です")

    client = _firestore_client()
    expires_at = datetime.now(UTC) + timedelta(minutes=_CODE_TTL_MINUTES)
    document = {
        "firebase_uid": user.firebase_uid,
        "expires_at": expires_at,
        "consumed_at": None,
    }
    # set() は既存ドキュメントを置換するため、コードが衝突すると発行済みで未使用の
    # コードの持ち主を別 user に上書きしてしまう (先のコードの持ち主が別 user として
    # 認証されうる)。create() で既存を壊さないようにし、衝突したら採番し直す。
    for _ in range(_CODE_CREATE_MAX_ATTEMPTS):
        code = _generate_code()
        doc_ref = client.collection(FIRESTORE_COLLECTION).document(_document_id(code))
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
    dependencies=[Depends(_redeem_limiter.dependency())],
)
async def redeem_pairing(body: RedeemPairingIn) -> RedeemPairingOut:
    """受信側デバイス (匿名でも可) がコードを引き換え Custom Token を受け取る。

    Firestore トランザクションで期限・消費済みチェック + `consumed_at` 更新を
    atomic に実行し、同一コードの二重使用を防止する。
    """
    code = _normalize_code(body.code)
    if not code:
        raise NotFound(message=_INVALID_CODE_MESSAGE)

    client = _firestore_client()
    doc_ref = client.collection(FIRESTORE_COLLECTION).document(_document_id(code))
    transaction = client.transaction()

    @transactional
    def _consume(tx: Transaction) -> str:
        snapshot = doc_ref.get(transaction=tx)
        data = (snapshot.to_dict() or {}) if snapshot.exists else {}
        expires_at = data.get("expires_at")
        firebase_uid = data.get("firebase_uid")
        if (
            not isinstance(firebase_uid, str)
            or expires_at is None
            or expires_at < datetime.now(UTC)
            or data.get("consumed_at") is not None
        ):
            raise NotFound(message=_INVALID_CODE_MESSAGE)
        tx.update(doc_ref, {"consumed_at": datetime.now(UTC)})
        return firebase_uid

    firebase_uid: str = await run_in_threadpool(_consume, transaction)

    try:
        custom_token: bytes = await run_in_threadpool(
            fb_auth.create_custom_token, firebase_uid
        )
    except (FirebaseError, ValueError) as e:
        # コードは消費済みのため、発行し直してもらう
        logger.exception("failed to create custom token")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="引き継ぎに失敗しました。発行元の端末でコードを発行し直してください。",
        ) from e
    return RedeemPairingOut(custom_token=custom_token.decode())
