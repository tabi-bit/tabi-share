from fastapi.testclient import TestClient
from sqlalchemy.orm import Session


def test_create_and_read_trip(client: TestClient, db_session: Session):
    # --- Create ---
    trip_data = {"title": "test trip", "detail": "test detail"}
    response = client.post("/trips/", json=trip_data)
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "url_id" in data
    trip_id = data["id"]
    url_id = data["url_id"]

    # --- Read (by ID) ---
    response = client.get(f"/trips/{trip_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == trip_data["title"]
    assert data["id"] == trip_id
    assert data["url_id"] == url_id

    # --- Read (by URL ID) ---
    response = client.get(f"/trips/url/{url_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == trip_data["title"]
    assert data["id"] == trip_id
    assert data["url_id"] == url_id


def test_create_trip_invalid_input(client: TestClient):
    """
    POST /api/trips/ で不正な入力が与えられた場合に 422 が返ることを検証
    """
    # title が欠落している不正なデータ
    invalid_trip_data = {"detail": "missing title"}
    response = client.post("/trips/", json=invalid_trip_data)
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])


def test_read_trips(client: TestClient, db_session: Session):
    # 2つの旅行を作成
    client.post("/trips/", json={"title": "trip 1", "detail": "d1"})
    client.post("/trips/", json={"title": "trip 2", "detail": "d2"})

    # --- Read (Multiple) ---
    response = client.get("/trips/")
    assert response.status_code == 200
    data = response.json()
    # 既存のテストで作成されたデータも含まれる可能性があるため、2以上であることだけをチェック
    assert len(data) >= 2


def test_get_trip_non_existent_id(client: TestClient, db_session: Session):
    """
    GET /trips/{trip_id} で存在しないIDが与えられた場合に 404 が返ることを検証
    """
    response = client.get("/trips/999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


def test_get_trip_by_url_id_non_existent(client: TestClient, db_session: Session):
    """
    GET /trips/url/{url_id} で存在しないURL IDが与えられた場合に 404 が返ることを検証
    """
    response = client.get("/trips/url/non_existent_url")
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


def test_update_trip(client: TestClient, db_session: Session):
    # 旅行を作成
    trip_data = {"title": "before update", "detail": "before"}
    response = client.post("/trips/", json=trip_data)
    trip_id = response.json()["id"]

    # --- Update ---
    update_data = {"title": "after update", "detail": "after"}
    response = client.put(f"/trips/{trip_id}", json=update_data)
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_data["title"]
    assert data["detail"] == update_data["detail"]

    # --- Read (Single) ---
    response = client.get(f"/trips/{trip_id}")
    assert response.json()["title"] == update_data["title"]


def test_update_trip_non_existent_id(client: TestClient, db_session: Session):
    """
    PUT /trips/{trip_id} で存在しないIDが与えられた場合に 404 が返ることを検証
    """
    update_data = {"title": "non existent", "detail": "update"}
    response = client.put("/trips/999", json=update_data)
    assert response.status_code == 404
    assert response.json()["detail"] == "Trip not found"


def test_update_trip_invalid_input(client: TestClient, db_session: Session):
    """
    PUT /trips/{trip_id} で不正な入力が与えられた場合に 422 が返ることを検証
    """
    trip_data = {"title": "test", "detail": "test"}
    response = client.post("/trips/", json=trip_data)
    trip_id = response.json()["id"]

    # title の型が不正なデータ
    invalid_update_data = {
        "title": 123,
        "detail": "invalid type",
    }  # Pydantic will catch this
    response = client.put(f"/trips/{trip_id}", json=invalid_update_data)
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])


def test_delete_trip(client: TestClient, db_session: Session):
    # 旅行を作成
    trip_data = {"title": "to be deleted", "detail": "delete"}
    response = client.post("/trips/", json=trip_data)
    trip_id = response.json()["id"]

    # --- Delete ---
    response = client.delete(f"/trips/{trip_id}")
    assert response.status_code == 204

    # --- 削除されたことを確認 ---
    response = client.get(f"/trips/{trip_id}")
    assert response.status_code == 404
