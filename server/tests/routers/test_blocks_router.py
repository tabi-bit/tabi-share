from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.block import Block as BlockSchema
from app.schemas.page import Page


async def test_create_and_read_block(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    # --- Create ---
    block_data = {
        "title": "test block",
        "start_time": "2023-01-01T10:00:00Z",  # Ensure timezone-aware for datetime
        "end_time": "2023-01-01T10:00:00Z",
        "detail": "test detail",
        "block_type": "event",
    }
    response = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks", json=block_data
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == block_data["title"]
    assert "id" in data
    block_id = data["id"]

    # --- Read (Single) ---
    response = await authed_client.get(f"/blocks/{block_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == block_data["title"]
    assert data["id"] == block_id


async def test_create_block_without_detail(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """
    POST /pages/{page_id}/blocks で detail を省略した場合に作成できることを検証
    """
    block_data = {
        "title": "no detail block",
        "start_time": "2023-01-01T10:00:00Z",
        "block_type": "event",
    }
    response = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks", json=block_data
    )
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == block_data["title"]
    assert data["detail"] is None


async def test_create_block_invalid_input(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """
    POST /pages/{page_id}/blocks で不正な入力が与えられた場合に 422 が返ることを検証
    """
    # title が欠落している不正なデータ
    invalid_block_data_missing_title = {
        "start_time": "2023-01-01T10:00:00Z",
        "end_time": "2023-01-01T10:00:00Z",
        "detail": "test detail",
        "block_type": "event",
    }
    response = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks", json=invalid_block_data_missing_title
    )
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])

    # title が max_length を超過している不正なデータ
    response = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "a" * 201,
            "start_time": "2023-01-01T10:00:00Z",
            "block_type": "event",
        },
    )
    assert response.status_code == 422
    assert any("title" in err["loc"] for err in response.json()["detail"])

    # detail が max_length を超過している不正なデータ
    response = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "test block",
            "start_time": "2023-01-01T10:00:00Z",
            "detail": "a" * 2001,
            "block_type": "event",
        },
    )
    assert response.status_code == 422
    assert any("detail" in err["loc"] for err in response.json()["detail"])

    # block_type が不正なデータ
    invalid_block_data_invalid_type = {
        "title": "test block",
        "start_time": "2023-01-01T10:00:00Z",
        "end_time": "2023-01-01T10:00:00Z",
        "detail": "test detail",
        "block_type": "invalid_type",
    }
    response = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks", json=invalid_block_data_invalid_type
    )
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("block_type" in err["loc"] for err in response.json()["detail"])


async def test_create_block_with_location(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """
    POST /pages/{page_id}/blocks で location を埋め込んで作成
    """
    block_data = {
        "title": "with location",
        "start_time": "2023-01-01T10:00:00Z",
        "block_type": "event",
        "location": {
            "name": "草津温泉",
            "google_place_id": None,
            "address": None,
            "latitude": None,
            "longitude": None,
        },
    }
    response = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks", json=block_data
    )
    assert response.status_code == 200
    data = response.json()
    assert data["location"] is not None
    assert data["location"]["name"] == "草津温泉"
    assert data["location_id"] == data["location"]["id"]




async def test_create_block_non_existent_page(
    client: AsyncClient, db_session: AsyncSession
):
    """
    POST /pages/{page_id}/blocks で存在しないpage_idが与えられた場合に 404 が返ることを検証
    """
    block_data = {
        "title": "test block",
        "start_time": "2023-01-01T10:00:00Z",
        "end_time": "2023-01-01T10:00:00Z",
        "detail": "test detail",
        "block_type": "event",
    }
    response = await client.post("/pages/999/blocks", json=block_data)
    assert response.status_code == 404
    assert response.json()["message"] == "Page not found"


async def test_read_blocks(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    # 2つのブロックを作成
    await authed_client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "block 1",
            "start_time": "2023-01-01T10:00:00Z",
            "detail": "d",
            "block_type": "event",
        },
    )
    await authed_client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "block 2",
            "start_time": "2023-01-01T10:00:00Z",
            "detail": "d",
            "block_type": "event",
        },
    )

    # --- Read (Multiple) ---
    response = await authed_client.get(f"/pages/{test_create_page.id}/blocks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "block 1"
    assert data[1]["title"] == "block 2"


async def test_get_block_non_existent_id(client: AsyncClient, db_session: AsyncSession):
    """
    GET /blocks/{block_id} で存在しないIDが与えられた場合に 404 が返ることを検証
    """
    response = await client.get("/blocks/999")
    assert response.status_code == 404
    assert response.json()["message"] == "Block not found"


async def test_update_block(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    # ブロックを作成
    block_data = {
        "title": "before update",
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "d",
        "block_type": "event",
    }
    response = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks", json=block_data
    )
    block_id = response.json()["id"]

    # --- Update ---
    update_data = {
        "title": "after update",
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "d",
        "block_type": "event",
    }
    response = await authed_client.put(f"/blocks/{block_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]

    # --- Read (Single) ---
    response = await authed_client.get(f"/blocks/{block_id}")
    assert response.json()["title"] == update_data["title"]


async def test_update_block_non_existent_id(
    client: AsyncClient, db_session: AsyncSession
):
    """
    PUT /blocks/{block_id} で存在しないIDが与えられた場合に 404 が返ることを検証
    """
    update_data = {
        "title": "non existent",
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "d",
        "block_type": "event",
    }
    response = await client.put("/blocks/999", json=update_data)
    assert response.status_code == 404
    assert response.json()["message"] == "Block not found"


async def test_update_block_invalid_input(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """
    PUT /blocks/{block_id} で不正な入力が与えられた場合に 422 が返ることを検証
    """
    block_data = {
        "title": "test",
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "d",
        "block_type": "event",
    }
    response = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks", json=block_data
    )
    block_id = response.json()["id"]

    # title の型が不正なデータ
    invalid_update_data = {
        "title": 123,
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "d",
        "block_type": "event",
    }  # Pydantic will catch this
    response = await authed_client.put(f"/blocks/{block_id}", json=invalid_update_data)
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])


async def test_delete_block(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    # ブロックを作成
    block_data = {
        "title": "to be deleted",
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "d",
        "block_type": "event",
    }
    response = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks", json=block_data
    )
    block_id = response.json()["id"]

    # --- Delete ---
    response = await authed_client.delete(f"/blocks/{block_id}")
    assert response.status_code == 204

    # --- 削除されたことを確認 ---
    response = await authed_client.get(f"/blocks/{block_id}")
    assert response.status_code == 404


# ---- 未認可アクセス 403 テスト ----


async def test_create_block_without_cookie_returns_403(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """実在するページ配下にCookieなしでブロック作成 → 403"""
    block_data = {
        "title": "unauthorized",
        "start_time": "2023-01-01T10:00:00Z",
        "block_type": "event",
    }
    response = await client.post(
        f"/pages/{test_create_page.id}/blocks", json=block_data
    )
    assert response.status_code == 403


async def test_get_block_without_cookie_returns_403(
    client: AsyncClient, db_session: AsyncSession, test_create_block: BlockSchema
):
    """実在するブロックにCookieなしでアクセス → 403"""
    response = await client.get(f"/blocks/{test_create_block.id}")
    assert response.status_code == 403


async def test_get_blocks_without_cookie_returns_403(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """実在するページ配下のブロック一覧をCookieなしで取得 → 403"""
    response = await client.get(f"/pages/{test_create_page.id}/blocks")
    assert response.status_code == 403


async def test_update_block_without_cookie_returns_403(
    client: AsyncClient, db_session: AsyncSession, test_create_block: BlockSchema
):
    """実在するブロックをCookieなしで更新 → 403"""
    update_data = {
        "title": "hacked",
        "start_time": "2023-01-01T10:00:00Z",
        "block_type": "event",
    }
    response = await client.put(
        f"/blocks/{test_create_block.id}", json=update_data
    )
    assert response.status_code == 403


async def test_delete_block_without_cookie_returns_403(
    client: AsyncClient, db_session: AsyncSession, test_create_block: BlockSchema
):
    """実在するブロックをCookieなしで削除 → 403"""
    response = await client.delete(f"/blocks/{test_create_block.id}")
    assert response.status_code == 403


# ---- Location 連携テスト ----


async def test_update_block_with_new_location(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """
    PUT /blocks/{id} で新しい location を埋め込んで更新
    """
    create_res = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "t",
            "start_time": "2023-01-01T10:00:00Z",
            "block_type": "event",
        },
    )
    block_id = create_res.json()["id"]

    update = {
        "title": "t",
        "start_time": "2023-01-01T10:00:00Z",
        "block_type": "event",
        "location": {
            "name": "新規",
            "google_place_id": None,
            "address": None,
            "latitude": None,
            "longitude": None,
        },
    }
    response = await authed_client.put(f"/blocks/{block_id}", json=update)
    assert response.status_code == 200
    data = response.json()
    assert data["location"] is not None
    assert data["location"]["name"] == "新規"


async def test_update_block_preserves_location_by_id(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """
    PUT /blocks/{id} で現在の location.id を渡すと行が維持される
    """
    create_res = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "t",
            "start_time": "2023-01-01T10:00:00Z",
            "block_type": "event",
            "location": {"name": "維持対象"},
        },
    )
    block_id = create_res.json()["id"]
    location_id = create_res.json()["location"]["id"]

    update = {
        "title": "t changed",
        "start_time": "2023-01-01T10:00:00Z",
        "block_type": "event",
        "location": {"id": location_id, "name": "維持対象"},
    }
    response = await authed_client.put(f"/blocks/{block_id}", json=update)
    assert response.status_code == 200
    assert response.json()["location"]["id"] == location_id


async def test_update_block_remove_location(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """
    PUT /blocks/{id} で location: null を指定すると解除される
    """
    create_res = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "t",
            "start_time": "2023-01-01T10:00:00Z",
            "block_type": "event",
            "location": {"name": "解除対象"},
        },
    )
    block_id = create_res.json()["id"]

    update = {
        "title": "t",
        "start_time": "2023-01-01T10:00:00Z",
        "block_type": "event",
        "location": None,
    }
    response = await authed_client.put(f"/blocks/{block_id}", json=update)
    assert response.status_code == 200
    assert response.json()["location"] is None
    assert response.json()["location_id"] is None


async def test_delete_block_removes_locations(
    authed_client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """
    DELETE /blocks/{id} で所有する location 行も削除される
    """
    from sqlalchemy import select

    from app.models import Location

    create_res = await authed_client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "drive",
            "start_time": "2023-01-01T10:00:00Z",
            "block_type": "move",
            "transportation_type": "car",
            "location": {"name": "出発"},
            "destination_location": {"name": "到着"},
        },
    )
    block_id = create_res.json()["id"]

    del_res = await authed_client.delete(f"/blocks/{block_id}")
    assert del_res.status_code == 204

    # locations テーブルに 1 行も残っていない
    rows = (await db_session.execute(select(Location))).scalars().all()
    assert rows == []


async def test_locations_endpoint_removed(
    client: AsyncClient, db_session: AsyncSession
):
    """
    /locations エンドポイントは廃止されているので 404 を返す
    """
    response = await client.post(
        "/locations", json={"name": "x"}
    )
    assert response.status_code == 404

    response = await client.get("/locations/1")
    assert response.status_code == 404
