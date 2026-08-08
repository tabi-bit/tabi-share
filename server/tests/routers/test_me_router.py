from httpx import AsyncClient
from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import SESSION_COOKIE_NAME
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
    client: AsyncClient, authed_client: AsyncClient
):
    authed_client.cookies.set(SESSION_COOKIE_NAME, "not-a-valid-jwt")
    response = await authed_client.get("/me/trips")
    assert response.status_code == 200
    assert response.json() == []
