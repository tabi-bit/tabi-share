"""Firebase Auth との統合エンドポイント。

現在の session (Cookie 経由の匿名 user) を Firebase 認証済み user に紐付ける。
"バックアップ・追加機能" 位置づけで、認証は編集の必須要件ではない (issue #194)。
"""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from firebase_admin import auth as fb_auth
from firebase_admin.exceptions import FirebaseError
from pydantic import BaseModel
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import ensure_session
from app.db_connection import get_db_session
from app.models import User, UserSession

router = APIRouter(tags=["Auth"], prefix="/auth")


class LinkFirebaseIn(BaseModel):
    id_token: str


class LinkFirebaseOut(BaseModel):
    firebase_uid: str


def _verify_id_token(id_token: str) -> str:
    """Firebase ID トークンを検証して firebase_uid を返す。失敗時は 401 を投げる。

    FirebaseError 基底クラスで受けることで、CertificateFetchError などのネットワーク
    起因の一時例外も含めて 500 として露出しないようにする。
    """
    try:
        decoded: dict[str, Any] = fb_auth.verify_id_token(id_token)
    except (FirebaseError, ValueError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Firebase ID token",
        ) from e
    uid = decoded.get("uid")
    if not isinstance(uid, str):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ID token payload has no uid",
        )
    return uid


@router.post(
    "/link",
    summary="Firebase 認証情報を現在の session に紐付ける",
    operation_id="auth-link-firebase",
    response_model=LinkFirebaseOut,
)
async def link_firebase(
    body: LinkFirebaseIn,
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db_session),
) -> LinkFirebaseOut:
    """Firebase ID トークンを検証し、現在の session を認証済 user に統合する。

    Cookie 無 (機種変更後の新デバイス) の場合でも動くよう、`ensure_session` で
    匿名 session を先に発行してから紐付ける。これで「Cookie 消失時のリカバリ」
    という本機能の主要ユースケースが成立する。

    ケース分岐 (issue #194 の grill-me 議論参照):
    - パターン 1 (初認証): 同 firebase_uid の user が DB に無い
      → 匿名 user の firebase_uid を UPDATE で埋める (昇格)
    - パターン 2 (別デバイスで先に認証済み): 同 firebase_uid の user が既に存在
      → 匿名 user の user_trip_access を INSERT ON CONFLICT DO NOTHING でマージし、
        session.user_id を振り替え、匿名 user を削除。archived フラグは既存側優先
    - パターン 3 (再認証): session が既に該当認証済 user に属している → 何もしない
      (Cookie パージ後の再ログインでもここに落ちるだけで副作用なし)
    """
    firebase_uid = _verify_id_token(body.id_token)
    session = await ensure_session(request, response, db)
    current_user = await db.get(User, session.user_id)
    if current_user is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Session references a missing user",
        )
    session_id = session.id

    existing = (
        await db.execute(select(User).where(User.firebase_uid == firebase_uid))
    ).scalar_one_or_none()

    if existing is None:
        # パターン 1: 匿名 user を認証済に昇格する。並行昇格 (別デバイスから同時に
        # 初回リンク) で users.firebase_uid の unique 違反が起きうるため、IntegrityError
        # を catch してパターン 2 (マージ) にフォールバックする。
        current_user.firebase_uid = firebase_uid
        try:
            await db.commit()
            return LinkFirebaseOut(firebase_uid=firebase_uid)
        except IntegrityError:
            await db.rollback()
            # rollback で ORM オブジェクトが expire するため再取得
            session = await db.get(UserSession, session_id)
            if session is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED, detail="Session lost"
                ) from None
            current_user = await db.get(User, session.user_id)
            existing = (
                await db.execute(select(User).where(User.firebase_uid == firebase_uid))
            ).scalar_one_or_none()
            if existing is None or current_user is None:
                # unique 違反があったのに existing が見つからない = 想定外
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Failed to resolve concurrent auth link",
                ) from None
            # fall-through してパターン 2 のマージ処理へ

    # パターン 2 (別 user へマージ) または パターン 3 (existing.id == current_user.id で no-op)
    if existing.id != current_user.id:
        await db.execute(
            text(
                """
                INSERT INTO user_trip_access (user_id, trip_id, archived, granted_at)
                SELECT :dst_user, trip_id, archived, granted_at
                FROM user_trip_access WHERE user_id = :src_user
                ON CONFLICT (user_id, trip_id) DO NOTHING
                """
            ),
            {"dst_user": existing.id, "src_user": current_user.id},
        )
        session.user_id = existing.id
        await db.delete(current_user)

    await db.commit()
    return LinkFirebaseOut(firebase_uid=firebase_uid)
