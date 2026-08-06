"""デバイス間引き継ぎ用の Firebase Custom Token 発行 (issue #194)。

iOS PWA (ホーム画面追加) では Safari とストレージが分離され、メールリンクも
常に Safari で開かれるため、メール認証によるリカバリが機能しない。
認証済みデバイスで発行した Firebase Custom Token を別デバイスに転送
(コピペ or QR) し、`signInWithCustomToken` で認証状態を移送することで、
`onAuthStateChanged` 経由の `/auth/link` (パターン 2: マージ) が発火し
匿名 session が同一 user_id に統合される。
"""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from firebase_admin import auth as fb_auth
from firebase_admin.exceptions import FirebaseError
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import ensure_session
from app.db_connection import get_db_session
from app.errors import Forbidden
from app.models import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Pair"], prefix="/pair")


class TransferTokenOut(BaseModel):
    custom_token: str


@router.post(
    "/transfer-token",
    summary="デバイス間引き継ぎ用の Firebase Custom Token を発行する",
    operation_id="pair-transfer-token",
    response_model=TransferTokenOut,
)
async def create_transfer_token(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db_session)],
) -> TransferTokenOut:
    """認証済み (firebase_uid あり) user 用に Firebase Custom Token を発行する。

    Custom Token は 1 時間有効 (Firebase 仕様、変更不可)。受信側デバイスで
    `signInWithCustomToken` に渡すことで、既存の `onAuthStateChanged` →
    `/auth/link` (パターン 2: マージ) 経路がそのまま発火する。
    """
    session = await ensure_session(request, response, db)
    user = await db.get(User, session.user_id)
    if user is None or user.firebase_uid is None:
        raise Forbidden(message="メール認証が必要です")
    try:
        token_bytes: bytes = fb_auth.create_custom_token(user.firebase_uid)
    except FirebaseError as e:
        # Firebase 側の一時的な障害
        logger.exception("failed to create custom token (FirebaseError)")
        raise Forbidden(message="Custom Token の発行に失敗しました") from e
    except ValueError as e:
        # 署名用 SA credentials が使えない (ローカル ADC で signBlob 権限が無い等)
        # 500 で長大な stack trace を返さず、環境設定エラーと分かる 503 にする
        logger.exception("failed to create custom token (signing not available)")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Custom Token の署名に失敗しました。"
                "サーバーの Firebase Admin 設定 (SA の signBlob 権限) を確認してください。"
            ),
        ) from e
    await db.commit()
    return TransferTokenOut(custom_token=token_bytes.decode())
