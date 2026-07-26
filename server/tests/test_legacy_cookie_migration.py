"""LegacyCookieMigrationMiddleware の統合テスト。

旧形式 (trip_ids 配列) の Cookie を持つ既存ユーザーが、透過的に新形式
(session_id) へ移行される挙動を検証する。移行期間終了時に本テストと
middleware 実装をセットで削除する想定。
"""

from datetime import UTC, datetime, timedelta

import jwt as pyjwt
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import SESSION_COOKIE_NAME
from app.config import get_settings
from app.cruds import trips as trips_cruds
from app.models import User, UserSession, UserTripAccess
from app.schemas.trip import TripCreateIn

settings = get_settings()


def _make_legacy_cookie(trip_ids: list[int]) -> str:
    """旧形式 (trip_ids 配列) の JWT を生成する"""
    payload = {
        "trip_ids": sorted(trip_ids),
        "exp": datetime.now(UTC) + timedelta(seconds=settings.cookie_max_age),
    }
    return pyjwt.encode(payload, settings.cookie_secret_key, algorithm="HS256")


async def test_legacy_cookie_migrates_and_grants_access(
    client: AsyncClient, db_session: AsyncSession
):
    """旧形式 Cookie を持つクライアントが認可を通過し、新形式 Cookie に切り替わる"""
    trip_id_a = await trips_cruds.create_trip(
        db=db_session,
        trip=TripCreateIn(title="a", detail=""),
        url_id="legacy-a",
    )
    trip_id_b = await trips_cruds.create_trip(
        db=db_session,
        trip=TripCreateIn(title="b", detail=""),
        url_id="legacy-b",
    )

    client.cookies.set(SESSION_COOKIE_NAME, _make_legacy_cookie([trip_id_a, trip_id_b]))

    # 認可が通る
    r = await client.get(f"/trips/{trip_id_a}")
    assert r.status_code == 200

    # レスポンスに新形式 Set-Cookie が付与されている
    # (client.cookies だと旧手動セット分と衝突するのでレスポンスから直接取る)
    new_token = r.cookies.get(SESSION_COOKIE_NAME)
    assert new_token is not None
    payload = pyjwt.decode(new_token, settings.cookie_secret_key, algorithms=["HS256"])
    assert isinstance(payload.get("session_id"), str)
    assert "trip_ids" not in payload

    # DB に匿名 user + session + user_trip_access が作られている
    session_id = payload["session_id"]
    session = await db_session.get(UserSession, session_id)
    assert session is not None

    user = await db_session.get(User, session.user_id)
    assert user is not None
    assert user.firebase_uid is None  # 匿名 user

    accesses = (
        (
            await db_session.execute(
                select(UserTripAccess).where(UserTripAccess.user_id == user.id)
            )
        )
        .scalars()
        .all()
    )
    assert {a.trip_id for a in accesses} == {trip_id_a, trip_id_b}


async def test_legacy_cookie_migration_skipped_for_new_cookie(
    client: AsyncClient, db_session: AsyncSession
):
    """新形式 Cookie は移行対象外 (そのままスルー)"""
    response = await client.post("/trips", json={"title": "x", "detail": ""})
    trip_id = response.json()["id"]
    original_token = client.cookies.get(SESSION_COOKIE_NAME)

    # 同じクライアントで GET しても Cookie は変わらない (移行が走らない)
    r = await client.get(f"/trips/{trip_id}")
    assert r.status_code == 200
    after_token = client.cookies.get(SESSION_COOKIE_NAME)
    assert after_token == original_token


async def test_legacy_cookie_migration_no_cookie_is_noop(
    client: AsyncClient, db_session: AsyncSession
):
    """Cookie が無ければ移行は走らず、下位ハンドラの認可ロジックが 403 を返す"""
    trip_id = await trips_cruds.create_trip(
        db=db_session,
        trip=TripCreateIn(title="no-cookie", detail=""),
        url_id="no-cookie",
    )
    r = await client.get(f"/trips/{trip_id}")
    assert r.status_code == 403
    # 新形式 Cookie も発行されていない
    assert client.cookies.get(SESSION_COOKIE_NAME) is None


async def test_legacy_cookie_ignores_deleted_trip_ids(
    client: AsyncClient, db_session: AsyncSession
):
    """旧 trip_ids に削除済み ID が混じっていても FK 違反にならず、有効な trip_id のみ移行される"""
    trip_id = await trips_cruds.create_trip(
        db=db_session,
        trip=TripCreateIn(title="alive", detail=""),
        url_id="alive-only",
    )
    # 実在する trip_id と実在しない trip_id を混ぜる
    client.cookies.set(SESSION_COOKIE_NAME, _make_legacy_cookie([trip_id, 999999]))

    # 有効な trip にアクセスできる (500 ではなく 200)
    r = await client.get(f"/trips/{trip_id}")
    assert r.status_code == 200

    # 新形式 Cookie が発行されている
    new_token = r.cookies.get(SESSION_COOKIE_NAME)
    assert new_token is not None
    payload = pyjwt.decode(new_token, settings.cookie_secret_key, algorithms=["HS256"])
    session_id = payload["session_id"]

    # 有効な trip のみ user_trip_access に入っている
    session = await db_session.get(UserSession, session_id)
    assert session is not None
    accesses = (
        (
            await db_session.execute(
                select(UserTripAccess).where(UserTripAccess.user_id == session.user_id)
            )
        )
        .scalars()
        .all()
    )
    assert {a.trip_id for a in accesses} == {trip_id}


async def test_legacy_cookie_with_empty_trip_ids_migrates_session_only(
    client: AsyncClient, db_session: AsyncSession
):
    """旧形式 Cookie で trip_ids が空 [] でも session だけは発行される"""
    client.cookies.set(SESSION_COOKIE_NAME, _make_legacy_cookie([]))

    # 認可が必要な endpoint に叩くと 403 (access がないため)
    r = await client.get("/trips/999999")
    assert r.status_code == 403

    # ただしレスポンスに新形式 Cookie は発行されている
    new_token = r.cookies.get(SESSION_COOKIE_NAME)
    assert new_token is not None
    payload = pyjwt.decode(new_token, settings.cookie_secret_key, algorithms=["HS256"])
    assert isinstance(payload.get("session_id"), str)
