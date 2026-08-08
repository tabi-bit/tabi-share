from httpx import ASGITransport, AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import SESSION_COOKIE_NAME
from app.main import app
from app.models import UserTripAccess
from app.schemas.trip import Trip


async def _set_archived(db: AsyncSession, trip_id: int, archived: bool) -> None:
    await db.execute(
        update(UserTripAccess)
        .where(UserTripAccess.trip_id == trip_id)
        .values(archived=archived)
    )
    await db.commit()


async def test_list_my_trips_without_cookie_returns_empty(client: AsyncClient):
    response = await client.get("/me/trips")
    assert response.status_code == 200
    assert response.json() == []


async def test_list_my_trips_returns_accessible_trips(
    authed_client: AsyncClient, test_create_trip: Trip
):
    response = await authed_client.get("/me/trips")
    assert response.status_code == 200
    data = response.json()
    assert [trip["id"] for trip in data] == [test_create_trip.id]
    assert data[0]["url_id"] == test_create_trip.url_id


async def test_list_my_trips_omits_pages(
    authed_client: AsyncClient, test_create_page: Trip
):
    response = await authed_client.get("/me/trips")
    assert response.status_code == 200
    assert "pages" not in response.json()[0]


async def test_list_my_trips_filters_by_archived(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_trip: Trip
):
    await _set_archived(db_session, test_create_trip.id, True)

    assert (await authed_client.get("/me/trips")).json() == []

    response = await authed_client.get("/me/trips", params={"archived": True})
    assert [trip["id"] for trip in response.json()] == [test_create_trip.id]


async def test_list_my_trips_refreshes_session_cookie(authed_client: AsyncClient):
    response = await authed_client.get("/me/trips")
    assert SESSION_COOKIE_NAME in response.headers.get("set-cookie", "")


async def test_list_my_trips_with_unknown_session_returns_empty(
    authed_client: AsyncClient,
):
    authed_client.cookies.set(SESSION_COOKIE_NAME, "not-a-valid-jwt")
    response = await authed_client.get("/me/trips")
    assert response.status_code == 200
    assert response.json() == []


async def test_archive_and_unarchive_moves_trip_between_lists(
    authed_client: AsyncClient, test_create_trip: Trip
):
    response = await authed_client.patch(
        f"/me/trips/{test_create_trip.id}", json={"archived": True}
    )
    assert response.status_code == 204
    assert (await authed_client.get("/me/trips")).json() == []
    archived = await authed_client.get("/me/trips", params={"archived": True})
    assert [trip["id"] for trip in archived.json()] == [test_create_trip.id]

    response = await authed_client.patch(
        f"/me/trips/{test_create_trip.id}", json={"archived": False}
    )
    assert response.status_code == 204
    assert [trip["id"] for trip in (await authed_client.get("/me/trips")).json()] == [
        test_create_trip.id
    ]


async def test_archive_without_access_is_forbidden(
    client: AsyncClient, test_create_trip: Trip
):
    response = await client.patch(
        f"/me/trips/{test_create_trip.id}", json={"archived": True}
    )
    assert response.status_code == 403


async def test_archive_does_not_affect_other_users(
    authed_client: AsyncClient, test_create_trip: Trip
):
    await authed_client.patch(
        f"/me/trips/{test_create_trip.id}", json={"archived": True}
    )

    # 別デバイス (Cookie を持たない別 session) が URL から辿ると通常一覧に出る
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://other-device"
    ) as other:
        await other.get(f"/trips/url/{test_create_trip.url_id}")
        assert [trip["id"] for trip in (await other.get("/me/trips")).json()] == [
            test_create_trip.id
        ]
