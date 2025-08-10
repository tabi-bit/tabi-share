import pytest
from app.cruds.users import get_user
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


@pytest.mark.asyncio
async def test_create_and_read_user(client: TestClient, db_session: Session):
    # --- Create ---
    email = "test@example.com"
    password = "testpassword"
    response = client.post("/api/users/", json={"email": email, "password": password})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == email
    assert "id" in data
    user_id = data["id"]

    # --- Read (Single) ---
    response = client.get(f"/api/users/{user_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == email
    assert data["id"] == user_id


@pytest.mark.asyncio
async def test_duplicate_user_error(client: TestClient, db_session: Session):
    email = "duplicate@example.com"
    password = "testpassword"
    # 1回目の作成は成功するはず
    response = client.post("/api/users/", json={"email": email, "password": password})
    assert response.status_code == 200

    # 2回目の同じメールアドレスでの作成は失敗するはず
    response = client.post("/api/users/", json={"email": email, "password": password})
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


@pytest.mark.asyncio
async def test_read_users(client: TestClient, db_session: Session):
    # 2人のユーザーを作成
    client.post("/api/users/", json={"email": "user1@example.com", "password": "p1"})
    client.post("/api/users/", json={"email": "user2@example.com", "password": "p2"})

    # --- Read (Multiple) ---
    response = client.get("/api/users/")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["email"] == "user1@example.com"
    assert data[1]["email"] == "user2@example.com"


@pytest.mark.asyncio
async def test_delete_user(client: TestClient, db_session: Session):
    # ユーザーを作成
    email = "delete_me@example.com"
    password = "testpassword"
    response = client.post("/api/users/", json={"email": email, "password": password})
    user_id = response.json()["id"]

    # --- Delete ---
    response = client.delete(f"/api/users/{user_id}")
    assert response.status_code == 200
    assert response.json()["email"] == email

    # --- 削除されたことを確認 ---
    # DBを直接確認
    db_user = await get_user(db_session, user_id=user_id)
    assert db_user is None
    # APIで確認
    response = client.get(f"/api/users/{user_id}")
    assert response.status_code == 404
