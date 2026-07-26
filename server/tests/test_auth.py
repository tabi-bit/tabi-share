"""auth.py (セッションキー方式) の単体テスト"""

from datetime import UTC, datetime, timedelta

import jwt as pyjwt
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.requests import Request
from starlette.responses import Response

from app.auth import (
    SESSION_COOKIE_NAME,
    _has_trip_access,
    decode_session_id,
    generate_session_id,
    grant_trip_access,
    require_trip_access,
)
from app.config import get_settings
from app.errors import Forbidden
from app.models import User, UserSession, UserTripAccess
from app.schemas.trip import TripCreateIn
from app.cruds import trips as trips_cruds

settings = get_settings()


def _make_request(cookies: dict[str, str] | None = None) -> Request:
    """テスト用の Starlette Request を構築する"""
    scope = {"type": "http", "method": "GET", "path": "/", "headers": []}
    if cookies:
        cookie_header = "; ".join(f"{k}={v}" for k, v in cookies.items())
        scope["headers"] = [(b"cookie", cookie_header.encode())]
    return Request(scope)


def _encode_new_session_jwt(session_id: str, **overrides) -> str:
    """新方式: session_id を payload に持つ JWT を生成する"""
    payload = {
        "session_id": session_id,
        "exp": datetime.now(UTC) + timedelta(seconds=settings.cookie_max_age),
        **overrides,
    }
    return pyjwt.encode(
        payload,
        overrides.pop("key", settings.cookie_secret_key),
        algorithm="HS256",
    )


# ---- decode_session_id ----


def test_decode_session_id_valid():
    token = _encode_new_session_jwt("abc123session")
    request = _make_request({SESSION_COOKIE_NAME: token})
    assert decode_session_id(request) == "abc123session"


def test_decode_session_id_no_cookie():
    assert decode_session_id(_make_request()) is None


def test_decode_session_id_invalid_jwt():
    request = _make_request({SESSION_COOKIE_NAME: "not-a-jwt"})
    assert decode_session_id(request) is None


def test_decode_session_id_wrong_signing_key():
    payload = {
        "session_id": "abc",
        "exp": datetime.now(UTC) + timedelta(seconds=3600),
    }
    token = pyjwt.encode(
        payload,
        "wrong-secret-key-that-is-at-least-32-bytes-long",
        algorithm="HS256",
    )
    request = _make_request({SESSION_COOKIE_NAME: token})
    assert decode_session_id(request) is None


def test_decode_session_id_expired_jwt():
    payload = {
        "session_id": "abc",
        "exp": datetime.now(UTC) - timedelta(hours=1),
    }
    token = pyjwt.encode(payload, settings.cookie_secret_key, algorithm="HS256")
    request = _make_request({SESSION_COOKIE_NAME: token})
    assert decode_session_id(request) is None


def test_decode_session_id_missing_field():
    """新形式 payload に session_id が無ければ None (旧形式 trip_ids の JWT も含む)"""
    payload = {
        "trip_ids": [1, 2, 3],
        "exp": datetime.now(UTC) + timedelta(seconds=3600),
    }
    token = pyjwt.encode(payload, settings.cookie_secret_key, algorithm="HS256")
    request = _make_request({SESSION_COOKIE_NAME: token})
    assert decode_session_id(request) is None


# ---- require_trip_access (DB 統合) ----


async def _seed_session_with_access(
    db: AsyncSession, trip_id: int
) -> tuple[User, UserSession]:
    user = User()
    db.add(user)
    await db.flush()
    session = UserSession(id=generate_session_id(), user_id=user.id)
    db.add(session)
    db.add(UserTripAccess(user_id=user.id, trip_id=trip_id))
    await db.commit()
    return user, session


async def test_require_trip_access_allowed(db_session: AsyncSession):
    trip_id = await trips_cruds.create_trip(
        db=db_session,
        trip=TripCreateIn(title="allowed", detail=""),
        url_id="require-allowed",
    )
    _, session = await _seed_session_with_access(db_session, trip_id)
    request = _make_request({SESSION_COOKIE_NAME: _encode_new_session_jwt(session.id)})
    assert (
        await require_trip_access(trip_id=trip_id, request=request, db=db_session)
        == trip_id
    )


async def test_require_trip_access_forbidden_no_cookie(db_session: AsyncSession):
    trip_id = await trips_cruds.create_trip(
        db=db_session,
        trip=TripCreateIn(title="no-cookie", detail=""),
        url_id="require-no-cookie",
    )
    request = _make_request()
    with pytest.raises(Forbidden):
        await require_trip_access(trip_id=trip_id, request=request, db=db_session)


async def test_require_trip_access_forbidden_no_grant(db_session: AsyncSession):
    """session はあるが user_trip_access に entry が無ければ 403"""
    trip_id = await trips_cruds.create_trip(
        db=db_session,
        trip=TripCreateIn(title="no-grant", detail=""),
        url_id="require-no-grant",
    )
    user = User()
    db_session.add(user)
    await db_session.flush()
    session = UserSession(id=generate_session_id(), user_id=user.id)
    db_session.add(session)
    await db_session.commit()

    request = _make_request({SESSION_COOKIE_NAME: _encode_new_session_jwt(session.id)})
    with pytest.raises(Forbidden):
        await require_trip_access(trip_id=trip_id, request=request, db=db_session)


# ---- _has_trip_access ----


async def test_has_trip_access_none_session_id(db_session: AsyncSession):
    assert await _has_trip_access(db_session, None, 1) is False


async def test_has_trip_access_unknown_session(db_session: AsyncSession):
    assert await _has_trip_access(db_session, "nonexistent-session", 1) is False


# ---- grant_trip_access (idempotent) ----


async def test_grant_trip_access_creates_session_and_grants(db_session: AsyncSession):
    trip_id = await trips_cruds.create_trip(
        db=db_session,
        trip=TripCreateIn(title="grant-new", detail=""),
        url_id="grant-new",
    )
    request = _make_request()
    response = Response()
    await grant_trip_access(request, response, trip_id, db_session)
    await db_session.commit()

    # 匿名 user と session が作られ、trip へのアクセスが登録される
    result = await db_session.execute(
        select(UserTripAccess).where(UserTripAccess.trip_id == trip_id)
    )
    accesses = result.scalars().all()
    assert len(accesses) == 1
    assert accesses[0].trip_id == trip_id

    # Set-Cookie がレスポンスに含まれる
    set_cookie = [h[1] for h in response.raw_headers if h[0].lower() == b"set-cookie"]
    assert any(SESSION_COOKIE_NAME.encode() in h for h in set_cookie)


async def test_grant_trip_access_idempotent_on_concurrent_grants(
    db_session: AsyncSession,
):
    """同一 (user, trip) への複数付与が (user_id, trip_id) 複合 PK で idempotent 化されること"""
    trip_id = await trips_cruds.create_trip(
        db=db_session,
        trip=TripCreateIn(title="idempotent", detail=""),
        url_id="idempotent",
    )
    user, session = await _seed_session_with_access(db_session, trip_id)
    request = _make_request({SESSION_COOKIE_NAME: _encode_new_session_jwt(session.id)})
    response = Response()
    # 既にアクセス権があるところに追加 grant を走らせても行数は増えない
    await grant_trip_access(request, response, trip_id, db_session)
    await grant_trip_access(request, response, trip_id, db_session)
    await db_session.commit()

    result = await db_session.execute(
        select(UserTripAccess).where(
            UserTripAccess.user_id == user.id, UserTripAccess.trip_id == trip_id
        )
    )
    assert len(result.scalars().all()) == 1
