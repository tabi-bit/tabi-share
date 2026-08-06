"""デバイス間引き継ぎ用 Custom Token 発行エンドポイント (POST /pair/transfer-token) のテスト。

Firebase Admin SDK の create_custom_token は monkeypatch で差し替える。
"""

from typing import Any

import pytest
from firebase_admin.exceptions import FirebaseError
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import SESSION_COOKIE_NAME, generate_session_id
from app.models import User, UserSession
from tests.conftest import _make_session_cookie_value


def _mock_create_custom_token(
    monkeypatch: pytest.MonkeyPatch, token: bytes = b"fake-custom-token"
) -> None:
    def _fake_create(uid: str, *args: Any, **kwargs: Any) -> bytes:
        return token

    monkeypatch.setattr("app.routers.pair.fb_auth.create_custom_token", _fake_create)


def _mock_create_custom_token_raises(
    monkeypatch: pytest.MonkeyPatch, exc: Exception
) -> None:
    def _raise(uid: str, *args: Any, **kwargs: Any) -> bytes:
        raise exc

    monkeypatch.setattr("app.routers.pair.fb_auth.create_custom_token", _raise)


async def _make_authed_session(db: AsyncSession, firebase_uid: str) -> UserSession:
    """firebase_uid ありの user + session を作成して session を返す"""
    user = User(firebase_uid=firebase_uid)
    db.add(user)
    await db.flush()
    session = UserSession(id=generate_session_id(), user_id=user.id)
    db.add(session)
    await db.commit()
    return session


async def _make_anon_session(db: AsyncSession) -> UserSession:
    """firebase_uid 無しの匿名 user + session を作成して session を返す"""
    user = User()
    db.add(user)
    await db.flush()
    session = UserSession(id=generate_session_id(), user_id=user.id)
    db.add(session)
    await db.commit()
    return session


async def test_transfer_token_returns_custom_token_for_authed_user(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    """firebase_uid あり user は Custom Token を受け取る"""
    _mock_create_custom_token(monkeypatch, token=b"custom-token-abc")
    session = await _make_authed_session(db_session, firebase_uid="uid-abc")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/transfer-token")
    assert r.status_code == 200
    assert r.json() == {"custom_token": "custom-token-abc"}


async def test_transfer_token_forbidden_for_anonymous_session(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    """firebase_uid 無し (匿名) の session は 403"""
    # mock は不要 (呼ばれないはず) だが、万一呼ばれても検知できるように仕込む
    _mock_create_custom_token(monkeypatch)
    session = await _make_anon_session(db_session)
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/transfer-token")
    assert r.status_code == 403


async def test_transfer_token_forbidden_without_cookie(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    """Cookie 無し → 匿名 session 発行 → firebase_uid 無しで 403"""
    _mock_create_custom_token(monkeypatch)
    r = await client.post("/pair/transfer-token")
    assert r.status_code == 403


async def test_transfer_token_firebase_error_returns_403(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    """Firebase Admin SDK の一時的な障害は 403 として返す"""
    _mock_create_custom_token_raises(monkeypatch, FirebaseError("unavailable", "boom"))
    session = await _make_authed_session(db_session, firebase_uid="uid-broken")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/transfer-token")
    assert r.status_code == 403


async def test_transfer_token_value_error_returns_503(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    """署名 SA credentials が使えないとき (ローカル ADC 等) は 503 で環境設定エラーを返す"""
    _mock_create_custom_token_raises(monkeypatch, ValueError("no signing SA"))
    session = await _make_authed_session(db_session, firebase_uid="uid-nosign")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/transfer-token")
    assert r.status_code == 503
