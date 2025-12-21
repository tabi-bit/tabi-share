import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.schemas.page import Page


@pytest.mark.asyncio
async def test_create_and_read_block(
    client: TestClient, db_session: Session, test_create_page: Page
):
    # --- Create ---
    block_data = {
        "title": "test block",
        "start_time": "2023-01-01T10:00:00Z",  # Ensure timezone-aware for datetime
        "end_time": "2023-01-01T12:00:00Z",
        "detail": "test detail",
        "block_type": "event",
    }
    response = client.post(f"/pages/{test_create_page.id}/blocks", json=block_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == block_data["title"]
    assert "id" in data
    block_id = data["id"]

    # --- Read (Single) ---
    response = client.get(f"/blocks/{block_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == block_data["title"]
    assert data["id"] == block_id


@pytest.mark.asyncio
async def test_create_block_invalid_input(
    client: TestClient, db_session: Session, test_create_page: Page
):
    """
    POST /pages/{page_id}/blocks で不正な入力が与えられた場合に 422 が返ることを検証
    """
    # title が欠落している不正なデータ
    invalid_block_data_missing_title = {
        "start_time": "2023-01-01T10:00:00Z",
        "end_time": "2023-01-01T12:00:00Z",
        "detail": "test detail",
        "block_type": "event",
    }
    response = client.post(
        f"/pages/{test_create_page.id}/blocks", json=invalid_block_data_missing_title
    )
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])

    # block_type が不正なデータ
    invalid_block_data_invalid_type = {
        "title": "test block",
        "start_time": "2023-01-01T10:00:00Z",
        "end_time": "2023-01-01T12:00:00Z",
        "detail": "test detail",
        "block_type": "invalid_type",
    }
    response = client.post(
        f"/pages/{test_create_page.id}/blocks", json=invalid_block_data_invalid_type
    )
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("block_type" in err["loc"] for err in response.json()["detail"])


@pytest.mark.asyncio
async def test_create_block_non_existent_page(client: TestClient, db_session: Session):
    """
    POST /pages/{page_id}/blocks で存在しないpage_idが与えられた場合に 404 が返ることを検証
    """
    block_data = {
        "title": "test block",
        "start_time": "2023-01-01T10:00:00Z",
        "end_time": "2023-01-01T12:00:00Z",
        "detail": "test detail",
        "block_type": "event",
    }
    response = client.post("/pages/999/blocks", json=block_data)
    assert response.status_code == 404
    assert response.json()["detail"] == "Page not found"


@pytest.mark.asyncio
async def test_read_blocks(
    client: TestClient, db_session: Session, test_create_page: Page
):
    # 2つのブロックを作成
    client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "block 1",
            "start_time": "2023-01-01T10:00:00Z",
            "detail": "d",
            "block_type": "event",
        },
    )
    client.post(
        f"/pages/{test_create_page.id}/blocks",
        json={
            "title": "block 2",
            "start_time": "2023-01-01T11:00:00Z",
            "detail": "d",
            "block_type": "event",
        },
    )

    # --- Read (Multiple) ---
    response = client.get(f"/pages/{test_create_page.id}/blocks")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["title"] == "block 1"
    assert data[1]["title"] == "block 2"


@pytest.mark.asyncio
async def test_get_block_non_existent_id(client: TestClient, db_session: Session):
    """
    GET /blocks/{block_id} で存在しないIDが与えられた場合に 404 が返ることを検証
    """
    response = client.get("/blocks/999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Block not found"


@pytest.mark.asyncio
async def test_update_block(
    client: TestClient, db_session: Session, test_create_page: Page
):
    # ブロックを作成
    block_data = {
        "title": "before update",
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "d",
        "block_type": "event",
    }
    response = client.post(f"/pages/{test_create_page.id}/blocks", json=block_data)
    block_id = response.json()["id"]

    # --- Update ---
    update_data = {
        "title": "after update",
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "d",
        "block_type": "event",
    }
    response = client.put(f"/blocks/{block_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]

    # --- Read (Single) ---
    response = client.get(f"/blocks/{block_id}")
    assert response.json()["title"] == update_data["title"]


@pytest.mark.asyncio
async def test_update_block_non_existent_id(client: TestClient, db_session: Session):
    """
    PUT /blocks/{block_id} で存在しないIDが与えられた場合に 404 が返ることを検証
    """
    update_data = {
        "title": "non existent",
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "d",
        "block_type": "event",
    }
    response = client.put("/blocks/999", json=update_data)
    assert response.status_code == 404
    assert response.json()["detail"] == "Block not found"


@pytest.mark.asyncio
async def test_update_block_invalid_input(
    client: TestClient, db_session: Session, test_create_page: Page
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
    response = client.post(f"/pages/{test_create_page.id}/blocks", json=block_data)
    block_id = response.json()["id"]

    # title の型が不正なデータ
    invalid_update_data = {
        "title": 123,
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "d",
        "block_type": "event",
    }  # Pydantic will catch this
    response = client.put(f"/blocks/{block_id}", json=invalid_update_data)
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])


@pytest.mark.asyncio
async def test_delete_block(
    client: TestClient, db_session: Session, test_create_page: Page
):
    # ブロックを作成
    block_data = {
        "title": "to be deleted",
        "start_time": "2023-01-01T10:00:00Z",
        "detail": "d",
        "block_type": "event",
    }
    response = client.post(f"/pages/{test_create_page.id}/blocks", json=block_data)
    block_id = response.json()["id"]

    # --- Delete ---
    response = client.delete(f"/blocks/{block_id}")
    assert response.status_code == 204

    # --- 削除されたことを確認 ---
    response = client.get(f"/blocks/{block_id}")
    assert response.status_code == 404
