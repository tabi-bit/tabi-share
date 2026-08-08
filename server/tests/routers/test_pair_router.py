"""デバイス引き継ぎ用ペアリングコード発行・引き換えのテスト。

Firebase Admin SDK の create_custom_token と Firestore client は monkeypatch で
in-memory の fake に差し替える。並行性は本テストでは検証せず、one-time consume の
論理判定のみを確認する。
"""

from datetime import UTC, datetime, timedelta
from typing import Any

import pytest
from firebase_admin.exceptions import FirebaseError
from google.cloud.exceptions import Conflict
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import SESSION_COOKIE_NAME, generate_session_id
from app.models import User, UserSession
from tests.conftest import _make_session_cookie_value


# ---- Fake Firestore ----


class _FakeSnapshot:
    def __init__(self, data: dict[str, Any] | None):
        self.exists = data is not None
        self._data = data

    def to_dict(self) -> dict[str, Any] | None:
        return self._data


class _FakeDocument:
    def __init__(self, store: dict[str, dict[str, Any]], key: str):
        self._store = store
        self._key = key

    def set(self, data: dict[str, Any]) -> None:
        self._store[self._key] = dict(data)

    def create(self, data: dict[str, Any]) -> None:
        """Firestore の create() 同様、既存ドキュメントがあれば Conflict を投げる"""
        if self._key in self._store:
            raise Conflict(f"document already exists: {self._key}")
        self._store[self._key] = dict(data)

    def get(self, transaction: Any = None) -> _FakeSnapshot:
        data = self._store.get(self._key)
        return _FakeSnapshot(dict(data) if data else None)

    def update(self, data: dict[str, Any]) -> None:
        if self._key in self._store:
            self._store[self._key].update(data)


class _FakeCollection:
    def __init__(self, store: dict[str, dict[str, Any]]):
        self._store = store

    def document(self, key: str) -> _FakeDocument:
        return _FakeDocument(self._store, key)


class _FakeTransaction:
    def __init__(self, store: dict[str, dict[str, Any]]):
        self._store = store

    def update(self, doc_ref: _FakeDocument, data: dict[str, Any]) -> None:
        doc_ref.update(data)


class _FakeFirestoreClient:
    def __init__(self) -> None:
        self._store: dict[str, dict[str, Any]] = {}

    def collection(self, name: str) -> _FakeCollection:
        return _FakeCollection(self._store)

    def transaction(self) -> _FakeTransaction:
        return _FakeTransaction(self._store)

    @property
    def store(self) -> dict[str, dict[str, Any]]:
        return self._store


# ---- Test fixtures ----


@pytest.fixture
def fake_firestore(monkeypatch: pytest.MonkeyPatch) -> _FakeFirestoreClient:
    """firestore.client と transactional を fake に置き換える。

    transactional は decorator を no-op 化 (fake tx を直接受け取る)。
    """
    client = _FakeFirestoreClient()
    monkeypatch.setattr("app.routers.pair.firestore.client", lambda: client)
    monkeypatch.setattr("app.routers.pair.transactional", lambda fn: fn)
    return client


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
    user = User(firebase_uid=firebase_uid)
    db.add(user)
    await db.flush()
    session = UserSession(id=generate_session_id(), user_id=user.id)
    db.add(session)
    await db.commit()
    return session


async def _make_anon_session(db: AsyncSession) -> UserSession:
    user = User()
    db.add(user)
    await db.flush()
    session = UserSession(id=generate_session_id(), user_id=user.id)
    db.add(session)
    await db.commit()
    return session


# ---- /pair/create ----


async def test_create_pairing_returns_code_for_authed_user(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    fake_firestore: _FakeFirestoreClient,
):
    """firebase_uid あり user は 8 桁コードを受け取り、Firestore に Custom Token が保存される"""
    _mock_create_custom_token(monkeypatch, token=b"custom-token-abc")
    session = await _make_authed_session(db_session, firebase_uid="uid-abc")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/create")
    assert r.status_code == 200
    body = r.json()
    code = body["code"]
    assert len(code) == 8
    # 生成コードは大文字 + 数字のみ (紛らわしい文字は除外)
    assert all(c in "23456789ABCDEFGHJKMNPQRSTUVWXYZ" for c in code)

    stored = fake_firestore.store[code]
    assert stored["custom_token"] == "custom-token-abc"
    assert stored["consumed_at"] is None


async def test_create_pairing_retries_on_code_collision(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    fake_firestore: _FakeFirestoreClient,
):
    """コードが衝突したら採番し直し、既存ドキュメントは書き換えない。

    set() だと衝突時に既存の未使用コードの custom_token を上書きしてしまい、
    先のコードの持ち主が別 user として認証されうるため、create() + リトライにしている。
    """
    _mock_create_custom_token(monkeypatch, token=b"new-token")
    fake_firestore.store["AAAA2222"] = {
        "custom_token": "existing-token",
        "expires_at": datetime.now(UTC) + timedelta(minutes=5),
        "consumed_at": None,
    }
    # 1 回目は既存コードと衝突させ、2 回目で空きコードを引かせる
    codes = iter(["AAAA2222", "BBBB3333"])
    monkeypatch.setattr("app.routers.pair._generate_code", lambda: next(codes))

    session = await _make_authed_session(db_session, firebase_uid="uid-collision")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/create")
    assert r.status_code == 200
    assert r.json()["code"] == "BBBB3333"
    # 既存コードのトークンは無傷
    assert fake_firestore.store["AAAA2222"]["custom_token"] == "existing-token"
    assert fake_firestore.store["BBBB3333"]["custom_token"] == "new-token"


async def test_create_pairing_forbidden_for_anonymous_session(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    fake_firestore: _FakeFirestoreClient,
):
    """firebase_uid 無しの匿名 user は 403 (発行不可)"""
    _mock_create_custom_token(monkeypatch)
    session = await _make_anon_session(db_session)
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/create")
    assert r.status_code == 403
    assert fake_firestore.store == {}


async def test_create_pairing_firebase_error_returns_403(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    fake_firestore: _FakeFirestoreClient,
):
    _mock_create_custom_token_raises(monkeypatch, FirebaseError("unavailable", "boom"))
    session = await _make_authed_session(db_session, firebase_uid="uid-broken")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/create")
    assert r.status_code == 403


async def test_create_pairing_value_error_returns_503(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    fake_firestore: _FakeFirestoreClient,
):
    """署名 SA credentials が使えないとき (ローカル ADC 等) は 503"""
    _mock_create_custom_token_raises(monkeypatch, ValueError("no signing SA"))
    session = await _make_authed_session(db_session, firebase_uid="uid-nosign")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/create")
    assert r.status_code == 503


# ---- /pair/redeem ----


async def test_redeem_returns_custom_token(
    client: AsyncClient, fake_firestore: _FakeFirestoreClient
):
    """有効なコードは custom_token を返し、Firestore で consumed_at がセットされる"""
    fake_firestore.store["A9K3P2Q7"] = {
        "custom_token": "redeemed-token",
        "expires_at": datetime.now(UTC) + timedelta(minutes=5),
        "consumed_at": None,
    }

    r = await client.post("/pair/redeem", json={"code": "A9K3P2Q7"})
    assert r.status_code == 200
    assert r.json() == {"custom_token": "redeemed-token"}
    assert fake_firestore.store["A9K3P2Q7"]["consumed_at"] is not None


async def test_redeem_normalizes_input_code(
    client: AsyncClient, fake_firestore: _FakeFirestoreClient
):
    """小文字・空白・ハイフンを含む入力も同じコードとして扱う。

    UI は `A9K3-P2Q7` のように 4 桁ずつ区切って表示するため、画面の見た目通りに
    ハイフン込みで入力されるケースを必ず通す。
    """
    fake_firestore.store["A9K3P2Q7"] = {
        "custom_token": "normalized-token",
        "expires_at": datetime.now(UTC) + timedelta(minutes=5),
        "consumed_at": None,
    }

    r = await client.post("/pair/redeem", json={"code": "  a9k3-p2q7 "})
    assert r.status_code == 200
    assert r.json() == {"custom_token": "normalized-token"}


async def test_redeem_blank_after_normalize_returns_404(
    client: AsyncClient, fake_firestore: _FakeFirestoreClient
):
    """正規化後に空になる入力は Firestore に触れず 404 (空 ID は SDK が受け付けないため)"""
    r = await client.post("/pair/redeem", json={"code": "---"})
    assert r.status_code == 404


async def test_redeem_unknown_code_returns_404(
    client: AsyncClient, fake_firestore: _FakeFirestoreClient
):
    # コードは _CODE_ALPHABET (紛らわしい 0/1/I/L/O を除いた 31 文字) のみで構成される
    r = await client.post("/pair/redeem", json={"code": "ZZZZ9999"})
    assert r.status_code == 404


async def test_redeem_expired_code_returns_403(
    client: AsyncClient, fake_firestore: _FakeFirestoreClient
):
    fake_firestore.store["EXPRD222"] = {
        "custom_token": "irrelevant",
        "expires_at": datetime.now(UTC) - timedelta(seconds=1),
        "consumed_at": None,
    }

    r = await client.post("/pair/redeem", json={"code": "EXPRD222"})
    assert r.status_code == 403


async def test_redeem_already_consumed_returns_403(
    client: AsyncClient, fake_firestore: _FakeFirestoreClient
):
    fake_firestore.store["USED2222"] = {
        "custom_token": "irrelevant",
        "expires_at": datetime.now(UTC) + timedelta(minutes=5),
        "consumed_at": datetime.now(UTC) - timedelta(seconds=10),
    }

    r = await client.post("/pair/redeem", json={"code": "USED2222"})
    assert r.status_code == 403
