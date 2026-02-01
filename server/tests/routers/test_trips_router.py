from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


async def test_create_and_read_trip(client: AsyncClient, db_session: AsyncSession):
    # --- Create ---
    trip_data = {"title": "test trip", "detail": "test detail"}
    response = await client.post("/trips/", json=trip_data)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "url_id" in data
    trip_id = data["id"]
    url_id = data["url_id"]

    # --- Read (by ID) ---
    response = await client.get(f"/trips/{trip_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == trip_data["title"]
    assert data["id"] == trip_id
    assert data["url_id"] == url_id

    # --- Read (by URL ID) ---
    response = await client.get(f"/trips/url/{url_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == trip_data["title"]
    assert data["id"] == trip_id
    assert data["url_id"] == url_id


async def test_create_trip_invalid_input(client: AsyncClient):
    """
    POST /api/trips/ で不正な入力が与えられた場合に 422 が返ることを検証
    """
    # title が欠落している不正なデータ
    invalid_trip_data = {"detail": "missing title"}
    response = await client.post("/trips/", json=invalid_trip_data)
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])


async def test_read_trips(client: AsyncClient, db_session: AsyncSession):
    # 2つの旅行を作成
    await client.post("/trips/", json={"title": "trip 1", "detail": "d1"})
    await client.post("/trips/", json={"title": "trip 2", "detail": "d2"})

    # --- Read (Multiple) ---
    response = await client.get("/trips/")
    assert response.status_code == 200
    data = response.json()
    # 既存のテストで作成されたデータも含まれる可能性があるため、2以上であることだけをチェック
    assert len(data) >= 2


async def test_get_trip_non_existent_id(client: AsyncClient, db_session: AsyncSession):
    """
    GET /trips/{trip_id} で存在しないIDが与えられた場合に 404 が返ることを検証
    """
    response = await client.get("/trips/999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


async def test_get_trip_by_url_id_non_existent(client: AsyncClient, db_session: AsyncSession):
    """
    GET /trips/url/{url_id} で存在しないURL IDが与えられた場合に 404 が返ることを検証
    """
    response = await client.get("/trips/url/non_existent_url")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


async def test_update_trip(client: AsyncClient, db_session: AsyncSession):
    # 旅行を作成
    trip_data = {"title": "before update", "detail": "before"}
    response = await client.post("/trips/", json=trip_data)
    trip_id = response.json()["id"]

    # --- Update ---
    update_data = {"title": "after update", "detail": "after"}
    response = await client.put(f"/trips/{trip_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]
    assert data["detail"] == update_data["detail"]

    # --- Read (Single) ---
    response = await client.get(f"/trips/{trip_id}")
    assert response.json()["title"] == update_data["title"]


async def test_update_trip_non_existent_id(client: AsyncClient, db_session: AsyncSession):
    """
    PUT /trips/{trip_id} で存在しないIDが与えられた場合に 404 が返ることを検証
    """
    update_data = {"title": "non existent", "detail": "update"}
    response = await client.put("/trips/999", json=update_data)
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


async def test_update_trip_invalid_input(client: AsyncClient, db_session: AsyncSession):
    """
    PUT /trips/{trip_id} で不正な入力が与えられた場合に 422 が返ることを検証
    """
    trip_data = {"title": "test", "detail": "test"}
    response = await client.post("/trips/", json=trip_data)
    trip_id = response.json()["id"]

    # title の型が不正なデータ
    invalid_update_data = {
        "title": 123,
        "detail": "invalid type",
    }  # Pydantic will catch this
    response = await client.put(f"/trips/{trip_id}", json=invalid_update_data)
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])


async def test_delete_trip(client: AsyncClient, db_session: AsyncSession):
    # 旅行を作成
    trip_data = {"title": "to be deleted", "detail": "delete"}
    response = await client.post("/trips/", json=trip_data)
    trip_id = response.json()["id"]

    # --- Delete ---
    response = await client.delete(f"/trips/{trip_id}")
    assert response.status_code == 204

    # --- 削除されたことを確認 ---
    response = await client.get(f"/trips/{trip_id}")
    assert response.status_code == 404
