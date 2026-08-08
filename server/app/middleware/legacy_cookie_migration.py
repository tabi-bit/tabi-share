"""旧形式セッション Cookie の透過的な移行ミドルウェア。

- 旧: JWT payload に `trip_ids` 配列を持つ (issue #194 以前の形式)
- 新: JWT payload に `session_id` を持つ

旧 Cookie を検出したら、匿名 user と session を作成し、旧 trip_ids を
user_trip_access に ON CONFLICT DO NOTHING で移行する。同じリクエスト内で
downstream の認可判定が新 session を使えるよう、request の cookies も
差し替えた上でレスポンスに新形式 Cookie を Set-Cookie で付与する。

**削除時**: このファイルを削除し、`main.py` の add_middleware 登録行 (1 行) を
削除するだけで剥がせる。本体の auth.py には旧形式のロジックは含まれない。
"""

import jwt
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.types import ASGIApp

from app import db_connection
from app.auth import (
    SESSION_COOKIE_NAME,
    encode_session_jwt,
    generate_session_id,
    set_session_cookie,
)
from app.config import get_settings
from app.models import Trip, User, UserSession, UserTripAccess


def _extract_legacy_trip_ids(request: Request) -> list[int] | None:
    """Cookie の JWT payload に trip_ids フィールドがあれば ints のリストを返す。

    旧形式でない (Cookie 無 / 新形式 / 不正) 場合は None を返す。
    """
    raw = request.cookies.get(SESSION_COOKIE_NAME)
    if not raw:
        return None
    settings = get_settings()
    try:
        payload = jwt.decode(raw, settings.cookie_secret_key, algorithms=["HS256"])
    except (jwt.InvalidTokenError, jwt.ExpiredSignatureError):
        return None
    ids = payload.get("trip_ids")
    if not isinstance(ids, list):
        return None
    return [tid for tid in ids if isinstance(tid, int)]


def _replace_session_cookie_in_scope(request: Request, new_jwt: str) -> None:
    """request.scope の cookie header を書き換え、Request.cookies のキャッシュも無効化する。

    downstream の Depends(get_db_session) / decode_session_id 等が新 JWT を
    見えるようにするための処置。BaseHTTPMiddleware は Request を再構築しないため、
    scope とキャッシュの両方を直接触る必要がある。
    """
    # scope の cookie header を差し替え
    headers = [
        (name, value)
        for name, value in request.scope["headers"]
        if name.lower() != b"cookie"
    ]
    new_cookies = dict(request.cookies)
    new_cookies[SESSION_COOKIE_NAME] = new_jwt
    cookie_header = "; ".join(f"{k}={v}" for k, v in new_cookies.items())
    headers.append((b"cookie", cookie_header.encode()))
    request.scope["headers"] = headers

    # Starlette Request.cookies は cached property のため、キャッシュを破棄する
    if hasattr(request, "_cookies"):
        del request._cookies


class LegacyCookieMigrationMiddleware(BaseHTTPMiddleware):
    """旧 trip_ids JWT を新形式 (session_id) へ透過的に移行する。"""

    def __init__(self, app: ASGIApp) -> None:
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        legacy_trip_ids = _extract_legacy_trip_ids(request)
        if legacy_trip_ids is None:
            return await call_next(request)

        # 匿名 user + session を作成し、旧 trip_ids を user_trip_access に流し込む
        new_session_id = generate_session_id()
        # 属性 lookup で解決することで conftest の AsyncSessionLocal monkey-patch を効かせる
        async with db_connection.AsyncSessionLocal() as db:
            user = User()
            db.add(user)
            await db.flush()
            db.add(UserSession(id=new_session_id, user_id=user.id))
            if legacy_trip_ids:
                # 旅程削除後に旧 Cookie を持つクライアントが来ると、削除済み trip_id が
                # 混入して FK 違反 → middleware 全体が 500 で永続 stuck する。
                # 実在する trip_id のみに絞ってから INSERT する。
                valid_trip_ids = (
                    (
                        await db.execute(
                            select(Trip.id).where(Trip.id.in_(legacy_trip_ids))
                        )
                    )
                    .scalars()
                    .all()
                )
                if valid_trip_ids:
                    await db.execute(
                        pg_insert(UserTripAccess)
                        .values(
                            [
                                {"user_id": user.id, "trip_id": tid}
                                for tid in valid_trip_ids
                            ]
                        )
                        .on_conflict_do_nothing(index_elements=["user_id", "trip_id"])
                    )
            await db.commit()

        # 同一リクエスト内で downstream から見えるよう request の Cookie を差し替える
        new_jwt = encode_session_jwt(new_session_id)
        _replace_session_cookie_in_scope(request, new_jwt)

        response = await call_next(request)
        # クライアントに新形式 Cookie を配って以降は移行が完了する
        set_session_cookie(request, response, new_session_id)
        return response
