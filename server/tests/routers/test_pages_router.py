import pytest_asyncio
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.page import Page
from app.schemas.trip import Trip


@pytest_asyncio.fixture
async def page_id(client: AsyncClient, db_session: AsyncSession, trip_id: int) -> int:
    """前提データとしてPageを作成し、そのIDを返すフィクスチャ"""
    page_data = {"title": "test page"}
    response = await client.post(f"/trips/{trip_id}/pages", json=page_data)
    assert response.status_code == 200
    return response.json()["id"]


async def test_create_and_read_page(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    # --- Create --- (page_id fixture already creates one)

    # --- Read (Single) ---
    response = await client.get(f"/pages/{test_create_page.id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == "test page"  # title from page_id fixture
    assert data["id"] == test_create_page.id


async def test_create_page_invalid_input(
    client: AsyncClient, db_session: AsyncSession, test_create_trip: Trip
):
    """
    POST /trips/{trip_id}/pages で不正な入力が与えられた場合に 422 が返ることを検証
    """
    # title が欠落している不正なデータ
    invalid_page_data = {}
    response = await client.post(
        f"/trips/{test_create_trip.id}/pages", json=invalid_page_data
    )
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])


async def test_create_page_non_existent_trip(
    client: AsyncClient, db_session: AsyncSession
):
    """
    POST /trips/{trip_id}/pages で存在しないtrip_idが与えられた場合に 404 が返ることを検証
    """
    page_data = {"title": "test page"}
    response = await client.post("/trips/999/pages", json=page_data)
    assert response.status_code == 404
    assert response.json()["message"] == "Trip not found"


async def test_read_pages(
    client: AsyncClient, db_session: AsyncSession, test_create_trip: Trip
):
    # 2つのページを作成
    await client.post(f"/trips/{test_create_trip.id}/pages", json={"title": "page 1"})
    await client.post(f"/trips/{test_create_trip.id}/pages", json={"title": "page 2"})

    # --- Read (Multiple) ---
    response = await client.get(f"/trips/{test_create_trip.id}/pages")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "page 1"
    assert data[1]["title"] == "page 2"


async def test_get_page_non_existent_id(client: AsyncClient, db_session: AsyncSession):
    """
    GET /pages/{page_id} で存在しないIDが与えられた場合に 404 が返ることを検証
    """
    response = await client.get("/pages/999")
    assert response.status_code == 404
    assert response.json()["message"] == "Page not found"


async def test_update_page(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    # --- Update ---
    update_data = {"title": "after update"}
    response = await client.put(f"/pages/{test_create_page.id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]

    # --- Read (Single) ---
    response = await client.get(f"/pages/{test_create_page.id}")
    assert response.json()["title"] == update_data["title"]


async def test_update_page_non_existent_id(
    client: AsyncClient, db_session: AsyncSession
):
    """
    PUT /pages/{page_id} で存在しないIDが与えられた場合に 404 が返ることを検証
    """
    update_data = {"title": "non existent"}
    response = await client.put("/pages/999", json=update_data)
    assert response.status_code == 404
    assert response.json()["message"] == "Page not found"


async def test_update_page_invalid_input(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """
    PUT /pages/{page_id} で不正な入力が与えられた場合に 422 が返ることを検証
    """
    # title の型が不正なデータ
    invalid_update_data = {"title": 123}  # Pydantic will catch this
    response = await client.put(
        f"/pages/{test_create_page.id}", json=invalid_update_data
    )
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])


async def test_delete_page(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    # --- Delete ---
    response = await client.delete(f"/pages/{test_create_page.id}")
    assert response.status_code == 204

    # --- 削除されたことを確認 ---
    response = await client.get(f"/pages/{test_create_page.id}")
    assert response.status_code == 404
