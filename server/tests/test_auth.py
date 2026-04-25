"""auth.py のユニットテスト"""

from datetime import UTC, datetime, timedelta

import jwt as pyjwt
import pytest
from starlette.requests import Request

from app.auth import COOKIE_PREFIX, get_allowed_trip_ids, require_trip_access
from app.config import get_settings
from app.errors import Forbidden

settings = get_settings()


def _make_request(cookies: dict[str, str] | None = None) -> Request:
    """テスト用の Starlette Request を構築する。"""
    scope = {"type": "http", "method": "GET", "path": "/", "headers": []}
    if cookies:
        cookie_header = "; ".join(f"{k}={v}" for k, v in cookies.items())
        scope["headers"] = [(b"cookie", cookie_header.encode())]
    return Request(scope)


def _encode_trip_jwt(trip_id: int, **overrides) -> str:
    """テスト用: 単一trip_id用のJWTを生成する。"""
    payload = {
        "trip_id": trip_id,
        "exp": datetime.now(UTC) + timedelta(seconds=settings.cookie_max_age),
        **overrides,
    }
    return pyjwt.encode(
        payload,
        overrides.pop("key", settings.cookie_secret_key),
        algorithm="HS256",
    )


# ---- get_allowed_trip_ids ----


def test_get_allowed_trip_ids_valid_cookie():
    token = _encode_trip_jwt(1)
    request = _make_request({f"{COOKIE_PREFIX}1": token})
    assert get_allowed_trip_ids(request) == {1}


def test_get_allowed_trip_ids_multiple_cookies():
    cookies = {
        f"{COOKIE_PREFIX}1": _encode_trip_jwt(1),
        f"{COOKIE_PREFIX}2": _encode_trip_jwt(2),
        "session_id": "unrelated",
    }
    request = _make_request(cookies)
    assert get_allowed_trip_ids(request) == {1, 2}


def test_get_allowed_trip_ids_no_cookies():
    request = _make_request()
    assert get_allowed_trip_ids(request) == set()


def test_get_allowed_trip_ids_invalid_jwt():
    request = _make_request({f"{COOKIE_PREFIX}1": "not-a-jwt"})
    assert get_allowed_trip_ids(request) == set()


def test_get_allowed_trip_ids_wrong_signing_key():
    payload = {
        "trip_id": 1,
        "exp": datetime.now(UTC) + timedelta(seconds=3600),
    }
    token = pyjwt.encode(payload, "wrong-secret-key", algorithm="HS256")
    request = _make_request({f"{COOKIE_PREFIX}1": token})
    assert get_allowed_trip_ids(request) == set()


def test_get_allowed_trip_ids_expired_jwt():
    payload = {
        "trip_id": 1,
        "exp": datetime.now(UTC) - timedelta(hours=1),
    }
    token = pyjwt.encode(payload, settings.cookie_secret_key, algorithm="HS256")
    request = _make_request({f"{COOKIE_PREFIX}1": token})
    assert get_allowed_trip_ids(request) == set()


# ---- require_trip_access ----


def test_require_trip_access_allowed():
    token = _encode_trip_jwt(1)
    request = _make_request({f"{COOKIE_PREFIX}1": token})
    assert require_trip_access(trip_id=1, request=request) == 1


def test_require_trip_access_forbidden():
    token = _encode_trip_jwt(1)
    request = _make_request({f"{COOKIE_PREFIX}1": token})
    with pytest.raises(Forbidden):
        require_trip_access(trip_id=2, request=request)
