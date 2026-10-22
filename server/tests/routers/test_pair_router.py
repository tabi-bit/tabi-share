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
from app.routers import pair
from app.routers.pair import _document_id
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

    def seed(self, code: str, **fields: Any) -> None:
        """コードに対応するドキュメントを置く。既定は有効期限内・未使用"""
        self._store[_document_id(code)] = {
            "firebase_uid": "uid-seeded",
            "expires_at": datetime.now(UTC) + timedelta(minutes=5),
            "consumed_at": None,
            **fields,
        }

    def doc_for(self, code: str) -> dict[str, Any]:
        return self._store[_document_id(code)]


# ---- Test fixtures ----


@pytest.fixture(autouse=True)
def reset_rate_limiters(monkeypatch: pytest.MonkeyPatch) -> None:
    """レート制限の回数はモジュール単位で持つため、テストごとに空にする"""
    monkeypatch.setattr(pair._create_limiter, "_hits", {})
    monkeypatch.setattr(pair._redeem_limiter, "_hits", {})


@pytest.fixture
def fake_firestore(monkeypatch: pytest.MonkeyPatch) -> _FakeFirestoreClient:
    """firestore.client と transactional を fake に置き換える。

    transactional は decorator を no-op 化 (fake tx を直接受け取る)。
    """
    client = _FakeFirestoreClient()
    monkeypatch.setattr("app.routers.pair.firestore.client", lambda: client)
    monkeypatch.setattr("app.routers.pair.transactional", lambda fn: fn)
    return client


def _mock_create_custom_token(monkeypatch: pytest.MonkeyPatch) -> None:
    """uid ごとに異なる token を返し、どの user の token かをテストで判別できるようにする"""

    def _fake_create(uid: str, *args: Any, **kwargs: Any) -> bytes:
        return f"token-for-{uid}".encode()

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
    fake_firestore: _FakeFirestoreClient,
):
    """firebase_uid あり user は 8 桁コードを受け取り、Firestore に uid が保存される"""
    session = await _make_authed_session(db_session, firebase_uid="uid-abc")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/create")
    assert r.status_code == 200
    code = r.json()["code"]
    assert len(code) == 8
    # 生成コードは大文字 + 数字のみ (紛らわしい文字は除外)
    assert all(c in "23456789ABCDEFGHJKMNPQRSTUVWXYZ" for c in code)

    stored = fake_firestore.doc_for(code)
    assert stored["firebase_uid"] == "uid-abc"
    assert stored["consumed_at"] is None


async def test_create_pairing_does_not_store_code_or_token(
    client: AsyncClient,
    db_session: AsyncSession,
    fake_firestore: _FakeFirestoreClient,
):
    """Firestore を読めても引き換えられないよう、コードもログイン用の token も置かない"""
    session = await _make_authed_session(db_session, firebase_uid="uid-secret")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/create")
    code = r.json()["code"]

    assert code not in fake_firestore.store
    stored = fake_firestore.doc_for(code)
    assert "custom_token" not in stored
    assert code not in str(stored)


async def test_create_pairing_retries_on_code_collision(
    client: AsyncClient,
    db_session: AsyncSession,
    monkeypatch: pytest.MonkeyPatch,
    fake_firestore: _FakeFirestoreClient,
):
    """コードが衝突したら採番し直し、既存ドキュメントは書き換えない。

    set() だと衝突時に既存の未使用コードの持ち主を上書きしてしまい、
    先のコードの持ち主が別 user として認証されうるため、create() + リトライにしている。
    """
    fake_firestore.seed("AAAA2222", firebase_uid="uid-existing")
    # 1 回目は既存コードと衝突させ、2 回目で空きコードを引かせる
    codes = iter(["AAAA2222", "BBBB3333"])
    monkeypatch.setattr("app.routers.pair._generate_code", lambda: next(codes))

    session = await _make_authed_session(db_session, firebase_uid="uid-collision")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/create")
    assert r.status_code == 200
    assert r.json()["code"] == "BBBB3333"
    # 既存コードの持ち主は無傷
    assert fake_firestore.doc_for("AAAA2222")["firebase_uid"] == "uid-existing"
    assert fake_firestore.doc_for("BBBB3333")["firebase_uid"] == "uid-collision"


async def test_create_pairing_forbidden_for_anonymous_session(
    client: AsyncClient,
    db_session: AsyncSession,
    fake_firestore: _FakeFirestoreClient,
):
    """firebase_uid 無しの匿名 user は 403 (発行不可)"""
    session = await _make_anon_session(db_session)
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/pair/create")
    assert r.status_code == 403
    assert fake_firestore.store == {}


async def test_create_pairing_is_rate_limited(
    client: AsyncClient,
    db_session: AsyncSession,
    fake_firestore: _FakeFirestoreClient,
):
    session = await _make_authed_session(db_session, firebase_uid="uid-many")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    statuses = [(await client.post("/pair/create")).status_code for _ in range(6)]
    assert statuses == [200] * 5 + [429]


# ---- /pair/redeem ----


async def test_redeem_returns_custom_token_for_stored_user(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    fake_firestore: _FakeFirestoreClient,
):
    """有効なコードは発行元 user の custom_token を返し、consumed_at がセットされる"""
    _mock_create_custom_token(monkeypatch)
    fake_firestore.seed("A9K3P2Q7", firebase_uid="uid-owner")

    r = await client.post("/pair/redeem", json={"code": "A9K3P2Q7"})
    assert r.status_code == 200
    assert r.json() == {"custom_token": "token-for-uid-owner"}
    assert fake_firestore.doc_for("A9K3P2Q7")["consumed_at"] is not None


async def test_redeem_normalizes_input_code(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    fake_firestore: _FakeFirestoreClient,
):
    """小文字・空白・ハイフンを含む入力も同じコードとして扱う。

    UI は `A9K3-P2Q7` のように 4 桁ずつ区切って表示するため、画面の見た目通りに
    ハイフン込みで入力されるケースを必ず通す。
    """
    _mock_create_custom_token(monkeypatch)
    fake_firestore.seed("A9K3P2Q7", firebase_uid="uid-normalized")

    r = await client.post("/pair/redeem", json={"code": "  a9k3-p2q7 "})
    assert r.status_code == 200
    assert r.json() == {"custom_token": "token-for-uid-normalized"}


@pytest.mark.parametrize(
    ("code", "seed_fields"),
    [
        # 正規化後に空になる入力は Firestore に触れない (空 ID は SDK が受け付けないため)
        ("---", None),
        # コードは _CODE_ALPHABET (紛らわしい 0/1/I/L/O を除いた 31 文字) のみで構成される
        ("ZZZZ9999", None),
        ("EXPRD222", {"expires_at": datetime.now(UTC) - timedelta(seconds=1)}),
        ("USED2222", {"consumed_at": datetime.now(UTC) - timedelta(seconds=10)}),
    ],
)
async def test_redeem_invalid_codes_share_one_response(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    fake_firestore: _FakeFirestoreClient,
    code: str,
    seed_fields: dict[str, Any] | None,
):
    """存在しない・期限切れ・使用済みを区別しない (総当たりの手がかりにさせない)"""
    _mock_create_custom_token(monkeypatch)
    if seed_fields is not None:
        fake_firestore.seed(code, **seed_fields)

    r = await client.post("/pair/redeem", json={"code": code})
    assert r.status_code == 404
    assert r.json()["message"] == pair._INVALID_CODE_MESSAGE


async def test_redeem_signing_failure_returns_503(
    client: AsyncClient,
    monkeypatch: pytest.MonkeyPatch,
    fake_firestore: _FakeFirestoreClient,
):
    """署名に失敗したら 503。コードは消費済みのため再発行してもらう"""
    _mock_create_custom_token_raises(monkeypatch, FirebaseError("unavailable", "boom"))
    fake_firestore.seed("SGNF2222")

    r = await client.post("/pair/redeem", json={"code": "SGNF2222"})
    assert r.status_code == 503
    assert fake_firestore.doc_for("SGNF2222")["consumed_at"] is not None


async def test_redeem_is_rate_limited_per_client_ip(
    client: AsyncClient, fake_firestore: _FakeFirestoreClient
):
    """X-Forwarded-For の先頭 (クライアントが書ける部分) を変えても制限を回避できない"""
    statuses = [
        (
            await client.post(
                "/pair/redeem",
                json={"code": "ZZZZ9999"},
                headers={"x-forwarded-for": f"10.0.0.{i}, 203.0.113.1"},
            )
        ).status_code
        for i in range(11)
    ]
    assert statuses == [404] * 10 + [429]

    other = await client.post(
        "/pair/redeem",
        json={"code": "ZZZZ9999"},
        headers={"x-forwarded-for": "203.0.113.2"},
    )
    assert other.status_code == 404
