from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.page import Page


async def test_create_and_read_block(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    # --- Create ---
    block_data = {
        "title": "test block",
        "start_time": "2023-01-01T10:00:00Z",  # Ensure timezone-aware for datetime
        "end_time": "2023-01-01T10:00:00Z",
        "detail": "test detail",
        "block_type": "event",
    }
    response = await client.post(f"/pages/{test_create_page.id}/blocks", json=block_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == block_data["title"]
    assert "id" in data
    block_id = data["id"]

    # --- Read (Single) ---
    response = await client.get(f"/blocks/{block_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == block_data["title"]
    assert data["id"] == block_id


async def test_create_block_without_detail(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """
    POST /pages/{page_id}/blocks で detail を省略した場合に作成できることを検証
    """
    block_data = {
        "title": "no detail block",
        "start_time": "2023-01-01T10:00:00Z",
        "block_type": "event",
    }
    response = await client.post(f"/pages/{test_create_page.id}/blocks", json=block_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == block_data["title"]
    assert data["detail"] is None


async def test_create_block_invalid_input(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
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
    response = await client.post(
        f"/pages/{test_create_page.id}/blocks", json=invalid_block_data_missing_title
    )
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])

    # title が max_length を超過している不正なデータ
    response = await client.post(
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
    response = await client.post(
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
    response = await client.post(
        f"/pages/{test_create_page.id}/blocks", json=invalid_block_data_invalid_type
    )
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("block_type" in err["loc"] for err in response.json()["detail"])


async def test_create_block_non_existent_page(client: AsyncClient, db_session: AsyncSession):
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
    assert response.json()["detail"] == "Page not found"


async def test_read_blocks(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    # 2つのブロックを作成
    await client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "block 1",
            "start_time": "2023-01-01T10:00:00",
            "detail": "d",
            "block_type": "event",
        },
    )
    await client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "block 2",
            "start_time": "2023-01-01T10:00:00Z",
            "detail": "d",
            "block_type": "event",
        },
    )

    # --- Read (Multiple) ---
    response = await client.get(f"/pages/{test_create_page.id}/blocks")
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
    assert response.json()["detail"] == "Block not found"


async def test_update_block(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    # ブロックを作成
    block_data = {
        "title": "before update",
        "start_time": "2023-01-01T10:00:00",
        "detail": "d",
        "block_type": "event",
    }
    response = await client.post(f"/pages/{test_create_page.id}/blocks", json=block_data)
    block_id = response.json()["id"]

    # --- Update ---
    update_data = {
        "title": "after update",
        "start_time": "2023-01-01T10:00:00",
        "detail": "d",
        "block_type": "event",
    }
    response = await client.put(f"/blocks/{block_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]

    # --- Read (Single) ---
    response = await client.get(f"/blocks/{block_id}")
    assert response.json()["title"] == update_data["title"]


async def test_update_block_non_existent_id(client: AsyncClient, db_session: AsyncSession):
    """
    PUT /blocks/{block_id} で存在しないIDが与えられた場合に 404 が返ることを検証
    """
    update_data = {
        "title": "non existent",
        "start_time": "2023-01-01T10:00:00",
        "detail": "d",
        "block_type": "event",
    }
    response = await client.put("/blocks/999", json=update_data)
    assert response.status_code == 404
    assert response.json()["detail"] == "Block not found"


async def test_update_block_invalid_input(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    """
    PUT /blocks/{block_id} で不正な入力が与えられた場合に 422 が返ることを検証
    """
    block_data = {
        "title": "test",
        "start_time": "2023-01-01T10:00:00",
        "detail": "d",
        "block_type": "event",
    }
    response = await client.post(f"/pages/{test_create_page.id}/blocks", json=block_data)
    block_id = response.json()["id"]

    # title の型が不正なデータ
    invalid_update_data = {
        "title": 123,
        "start_time": "2023-01-01T10:00:00",
        "detail": "d",
        "block_type": "event",
    }  # Pydantic will catch this
    response = await client.put(f"/blocks/{block_id}", json=invalid_update_data)
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])


async def test_delete_block(
    client: AsyncClient, db_session: AsyncSession, test_create_page: Page
):
    # ブロックを作成
    block_data = {
        "title": "to be deleted",
        "start_time": "2023-01-01T10:00:00",
        "detail": "d",
        "block_type": "event",
    }
    response = await client.post(f"/pages/{test_create_page.id}/blocks", json=block_data)
    block_id = response.json()["id"]

    # --- Delete ---
    response = await client.delete(f"/blocks/{block_id}")
    assert response.status_code == 204

    # --- 削除されたことを確認 ---
    response = await client.get(f"/blocks/{block_id}")
    assert response.status_code == 404
