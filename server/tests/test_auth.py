"""auth.py のユニットテスト"""

from datetime import UTC, datetime, timedelta

import jwt as pyjwt
import pytest
from starlette.requests import Request

from app.auth import SESSION_COOKIE_NAME, get_allowed_trip_ids, require_trip_access
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


def _encode_session_jwt(trip_ids: list[int], **overrides) -> str:
    """テスト用: trip_ids 配列を持つセッション JWT を生成する。"""
    payload = {
        "trip_ids": trip_ids,
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
    token = _encode_session_jwt([1])
    request = _make_request({SESSION_COOKIE_NAME: token})
    assert get_allowed_trip_ids(request) == {1}


def test_get_allowed_trip_ids_multiple_ids():
    token = _encode_session_jwt([1, 2, 3])
    request = _make_request({SESSION_COOKIE_NAME: token, "session_id": "unrelated"})
    assert get_allowed_trip_ids(request) == {1, 2, 3}


def test_get_allowed_trip_ids_no_cookies():
    request = _make_request()
    assert get_allowed_trip_ids(request) == set()


def test_get_allowed_trip_ids_invalid_jwt():
    request = _make_request({SESSION_COOKIE_NAME: "not-a-jwt"})
    assert get_allowed_trip_ids(request) == set()


def test_get_allowed_trip_ids_wrong_signing_key():
    payload = {
        "trip_ids": [1],
        "exp": datetime.now(UTC) + timedelta(seconds=3600),
    }
    token = pyjwt.encode(payload, "wrong-secret-key", algorithm="HS256")
    request = _make_request({SESSION_COOKIE_NAME: token})
    assert get_allowed_trip_ids(request) == set()


def test_get_allowed_trip_ids_expired_jwt():
    payload = {
        "trip_ids": [1],
        "exp": datetime.now(UTC) - timedelta(hours=1),
    }
    token = pyjwt.encode(payload, settings.cookie_secret_key, algorithm="HS256")
    request = _make_request({SESSION_COOKIE_NAME: token})
    assert get_allowed_trip_ids(request) == set()


def test_get_allowed_trip_ids_payload_without_trip_ids():
    """JWT に trip_ids キーが無い場合は空 set を返す"""
    payload = {"exp": datetime.now(UTC) + timedelta(seconds=3600)}
    token = pyjwt.encode(payload, settings.cookie_secret_key, algorithm="HS256")
    request = _make_request({SESSION_COOKIE_NAME: token})
    assert get_allowed_trip_ids(request) == set()


# ---- require_trip_access ----


def test_require_trip_access_allowed():
    token = _encode_session_jwt([1])
    request = _make_request({SESSION_COOKIE_NAME: token})
    assert require_trip_access(trip_id=1, request=request) == 1


def test_require_trip_access_forbidden():
    token = _encode_session_jwt([1])
    request = _make_request({SESSION_COOKIE_NAME: token})
    with pytest.raises(Forbidden):
        require_trip_access(trip_id=2, request=request)


def test_require_trip_access_with_multiple_ids():
    """複数 trip_ids 含まれる場合、その中の任意の id でアクセス可能"""
    token = _encode_session_jwt([1, 5, 10])
    request = _make_request({SESSION_COOKIE_NAME: token})
    assert require_trip_access(trip_id=5, request=request) == 5
