"""Firebase Auth 統合エンドポイント (POST /auth/link) のテスト。

Firebase Admin SDK の verify_id_token は monkeypatch で差し替える。
router は別 AsyncSession で commit するため、test 側では identity map を避けて
raw SQL で結果を検証する。
"""

from typing import Any

import pytest
from httpx import AsyncClient
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import SESSION_COOKIE_NAME, generate_session_id
from app.cruds import trips as trips_cruds
from app.models import User, UserSession
from app.routers.auth import _insert_or_get_user_id
from app.schemas.trip import TripCreateIn
from tests.conftest import _make_session_cookie_value


def _mock_verify_id_token(monkeypatch: pytest.MonkeyPatch, uid: str) -> None:
    """verify_id_token を uid を返す関数に差し替える"""

    def _fake_verify(id_token: str, *args: Any, **kwargs: Any) -> dict[str, Any]:
        return {"uid": uid}

    monkeypatch.setattr("app.routers.auth.fb_auth.verify_id_token", _fake_verify)


def _mock_verify_id_token_raises(
    monkeypatch: pytest.MonkeyPatch, exc: Exception
) -> None:
    def _raise(id_token: str, *args: Any, **kwargs: Any) -> dict[str, Any]:
        raise exc

    monkeypatch.setattr("app.routers.auth.fb_auth.verify_id_token", _raise)


async def _make_anon_session(db: AsyncSession) -> UserSession:
    """匿名 user + session を作成して session を返す"""
    user = User()
    db.add(user)
    await db.flush()
    session = UserSession(id=generate_session_id(), user_id=user.id)
    db.add(session)
    await db.commit()
    return session


async def test_link_promotes_anonymous_user(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    """パターン 1: 同 firebase_uid の user がまだ無ければ、匿名 user を認証済に昇格"""
    _mock_verify_id_token(monkeypatch, uid="firebase-uid-new")
    session = await _make_anon_session(db_session)
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/auth/link", json={"id_token": "any"})
    assert r.status_code == 200
    assert r.json() == {"firebase_uid": "firebase-uid-new"}

    user = await db_session.get(User, session.user_id)
    assert user is not None
    assert user.firebase_uid == "firebase-uid-new"


async def test_link_merges_into_existing_user(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    """パターン 2: 同 firebase_uid の user が既にあれば、匿名 user の trip_access をマージし session を振り替え"""
    _mock_verify_id_token(monkeypatch, uid="firebase-uid-existing")

    # 別デバイスで先に認証済み: existing user は trip 100 を archived=true で持つ
    existing = User(firebase_uid="firebase-uid-existing")
    db_session.add(existing)
    await db_session.flush()

    trip_shared = await trips_cruds.create_trip(
        db=db_session, trip=TripCreateIn(title="shared", detail=""), url_id="shared"
    )
    trip_anon_only = await trips_cruds.create_trip(
        db=db_session,
        trip=TripCreateIn(title="anon-only", detail=""),
        url_id="anon-only",
    )

    # 事前準備: raw SQL で archived=true を含む access を仕込む
    # (test 側 ORM で add すると router 側とキャッシュが噛み合わない)
    await db_session.execute(
        text(
            "INSERT INTO user_trip_access (user_id, trip_id, archived) "
            "VALUES (:uid, :tid, TRUE)"
        ),
        {"uid": existing.id, "tid": trip_shared},
    )
    # 匿名 user (現在の session): shared (archived=false) + anon-only
    session = await _make_anon_session(db_session)
    anon_user_id = session.user_id
    await db_session.execute(
        text(
            "INSERT INTO user_trip_access (user_id, trip_id, archived) "
            "VALUES (:uid, :tid, FALSE), (:uid, :tid2, FALSE)"
        ),
        {"uid": anon_user_id, "tid": trip_shared, "tid2": trip_anon_only},
    )
    await db_session.commit()

    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/auth/link", json={"id_token": "any"})
    assert r.status_code == 200

    # router は別 AsyncSession で commit するので、identity map を避けて raw SQL で検証する
    session_user_id = (
        await db_session.execute(
            text("SELECT user_id FROM sessions WHERE id = :sid"),
            {"sid": session.id},
        )
    ).scalar()
    assert session_user_id == existing.id

    # 匿名 user は削除されている
    anon_count = (
        await db_session.execute(
            text("SELECT COUNT(*) FROM users WHERE id = :uid"),
            {"uid": anon_user_id},
        )
    ).scalar()
    assert anon_count == 0

    # existing の trip_access: 両 trip 分が入っており、shared の archived は既存側 (true) が保持される
    rows = (
        await db_session.execute(
            text(
                "SELECT trip_id, archived FROM user_trip_access "
                "WHERE user_id = :uid ORDER BY trip_id"
            ),
            {"uid": existing.id},
        )
    ).all()
    by_trip = {row.trip_id: row.archived for row in rows}
    assert by_trip == {trip_shared: True, trip_anon_only: False}


async def test_link_is_idempotent_on_reauth(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    """パターン 3: session が既に該当認証済 user のものなら (再認証) 何もしない"""
    _mock_verify_id_token(monkeypatch, uid="firebase-uid-reauth")

    user = User(firebase_uid="firebase-uid-reauth")
    db_session.add(user)
    await db_session.flush()
    session = UserSession(id=generate_session_id(), user_id=user.id)
    db_session.add(session)
    await db_session.commit()

    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/auth/link", json={"id_token": "any"})
    assert r.status_code == 200

    # 何も変わっていないことを確認: user 一意、session の user_id 変わらず
    await db_session.refresh(session)
    assert session.user_id == user.id
    users = (await db_session.execute(select(User))).scalars().all()
    assert len(users) == 1  # 増減なし


async def _make_authed_session(db: AsyncSession, firebase_uid: str) -> UserSession:
    """認証済み user + session を作成して session を返す"""
    user = User(firebase_uid=firebase_uid)
    db.add(user)
    await db.flush()
    session = UserSession(id=generate_session_id(), user_id=user.id)
    db.add(session)
    await db.commit()
    return session


async def _grant_access(db: AsyncSession, user_id: int, trip_id: int) -> None:
    """アクセス権を仕込む"""
    await db.execute(
        text("INSERT INTO user_trip_access (user_id, trip_id) VALUES (:uid, :tid)"),
        {"uid": user_id, "tid": trip_id},
    )
    await db.commit()


async def _trip_ids_of(db: AsyncSession, user_id: int) -> list[int]:
    """user が持つ trip_id 一覧を返す"""
    rows = await db.execute(
        text(
            "SELECT trip_id FROM user_trip_access WHERE user_id = :uid ORDER BY trip_id"
        ),
        {"uid": user_id},
    )
    return list(rows.scalars())


async def test_link_switches_to_unknown_account_without_touching_current_user(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    """パターン 4 (切り替え先 user 無し): 認証済み session に別 uid が来ても元アカウントは無傷 (issue #223)"""
    session = await _make_authed_session(db_session, firebase_uid="uid-current")
    current_user_id = session.user_id
    trip_id = await trips_cruds.create_trip(
        db=db_session, trip=TripCreateIn(title="x", detail=""), url_id="switch-new"
    )
    await _grant_access(db_session, current_user_id, trip_id)

    _mock_verify_id_token(monkeypatch, uid="uid-other")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/auth/link", json={"id_token": "any"})
    assert r.status_code == 200
    assert r.json() == {"firebase_uid": "uid-other"}

    # 元アカウントは firebase_uid を奪われず、旅程も保持したまま存在し続ける
    current_uid = (
        await db_session.execute(
            text("SELECT firebase_uid FROM users WHERE id = :uid"),
            {"uid": current_user_id},
        )
    ).scalar()
    assert current_uid == "uid-current"
    assert await _trip_ids_of(db_session, current_user_id) == [trip_id]

    # session は新規作成された切り替え先 user を指し、旅程はマージされていない
    new_user_id = (
        await db_session.execute(
            text("SELECT user_id FROM sessions WHERE id = :sid"), {"sid": session.id}
        )
    ).scalar()
    assert new_user_id != current_user_id
    new_uid = (
        await db_session.execute(
            text("SELECT firebase_uid FROM users WHERE id = :uid"), {"uid": new_user_id}
        )
    ).scalar()
    assert new_uid == "uid-other"
    assert await _trip_ids_of(db_session, new_user_id) == []


async def test_link_switches_to_existing_account_without_merging(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    """パターン 4 (切り替え先 user あり): 元アカウントは削除もマージもされない (issue #223)"""
    session = await _make_authed_session(db_session, firebase_uid="uid-current-2")
    current_user_id = session.user_id
    other = User(firebase_uid="uid-other-2")
    db_session.add(other)
    await db_session.flush()
    other_user_id = other.id

    trip_current = await trips_cruds.create_trip(
        db=db_session, trip=TripCreateIn(title="cur", detail=""), url_id="switch-cur"
    )
    trip_other = await trips_cruds.create_trip(
        db=db_session, trip=TripCreateIn(title="oth", detail=""), url_id="switch-oth"
    )
    await _grant_access(db_session, current_user_id, trip_current)
    await _grant_access(db_session, other_user_id, trip_other)

    _mock_verify_id_token(monkeypatch, uid="uid-other-2")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/auth/link", json={"id_token": "any"})
    assert r.status_code == 200

    # 元アカウントは残存し、旅程も他アカウントに混ざっていない
    assert await _trip_ids_of(db_session, current_user_id) == [trip_current]
    assert await _trip_ids_of(db_session, other_user_id) == [trip_other]
    current_uid = (
        await db_session.execute(
            text("SELECT firebase_uid FROM users WHERE id = :uid"),
            {"uid": current_user_id},
        )
    ).scalar()
    assert current_uid == "uid-current-2"

    # session だけが切り替え先へ張り替わる (session_id は維持)
    session_user_id = (
        await db_session.execute(
            text("SELECT user_id FROM sessions WHERE id = :sid"), {"sid": session.id}
        )
    ).scalar()
    assert session_user_id == other_user_id


async def test_link_without_cookie_creates_anonymous_session_and_promotes(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    """Cookie 無し (機種変更後の新デバイス) でも動く。匿名 session を発行してから昇格。

    これがバックアップ用メール認証の主要ユースケース (Cookie 消失時のリカバリ) を成立させる。
    """
    _mock_verify_id_token(monkeypatch, uid="firebase-uid-new-device")
    r = await client.post("/auth/link", json={"id_token": "any"})
    assert r.status_code == 200
    assert r.json() == {"firebase_uid": "firebase-uid-new-device"}
    # ensure_session が匿名 session を発行し、新形式 Cookie が付与されている
    assert r.cookies.get(SESSION_COOKIE_NAME) is not None


async def test_link_invalid_id_token_returns_401(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    from firebase_admin.auth import InvalidIdTokenError

    _mock_verify_id_token_raises(monkeypatch, InvalidIdTokenError("bad"))
    session = await _make_anon_session(db_session)
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    r = await client.post("/auth/link", json={"id_token": "invalid"})
    assert r.status_code == 401


async def test_link_switch_is_idempotent(
    client: AsyncClient, db_session: AsyncSession, monkeypatch: pytest.MonkeyPatch
):
    """パターン 4 を 2 回叩いても 2 回目はパターン 3 に落ち、user は増えない"""
    _mock_verify_id_token(monkeypatch, uid="uid-switch-twice")
    session = await _make_authed_session(db_session, firebase_uid="uid-before-switch")
    client.cookies.set(SESSION_COOKIE_NAME, _make_session_cookie_value(session.id))

    assert (
        await client.post("/auth/link", json={"id_token": "any"})
    ).status_code == 200
    assert (
        await client.post("/auth/link", json={"id_token": "any"})
    ).status_code == 200

    user_count = (await db_session.execute(text("SELECT COUNT(*) FROM users"))).scalar()
    assert user_count == 2  # 元アカウント + 切り替え先のみ
    session_uid = (
        await db_session.execute(
            text(
                "SELECT u.firebase_uid FROM users u "
                "JOIN sessions s ON s.user_id = u.id WHERE s.id = :sid"
            ),
            {"sid": session.id},
        )
    ).scalar()
    assert session_uid == "uid-switch-twice"


async def test_insert_or_get_user_id_returns_existing_on_conflict(
    db_session: AsyncSession,
):
    """ON CONFLICT DO NOTHING で 0 行になった場合も SELECT フォールバックで同じ id を返す"""
    first = await _insert_or_get_user_id(db_session, "uid-conflict")
    second = await _insert_or_get_user_id(db_session, "uid-conflict")
    assert first == second
    duplicated = (
        await db_session.execute(
            text("SELECT COUNT(*) FROM users WHERE firebase_uid = 'uid-conflict'")
        )
    ).scalar()
    assert duplicated == 1
