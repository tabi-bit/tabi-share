import jwt as pyjwt
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import SESSION_COOKIE_NAME
from app.config import get_settings
from app.schemas.trip import Trip


async def test_create_and_read_trip(client: AsyncClient, db_session: AsyncSession):
    # --- Create ---
    trip_data = {"title": "test trip", "detail": "test detail"}
    response = await client.post("/trips", json=trip_data)
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


async def test_create_trip_without_detail(
    client: AsyncClient, db_session: AsyncSession
):
    """
    POST /trips で detail を省略した場合に作成できることを検証
    """
    response = await client.post("/trips", json={"title": "no detail trip"})
    assert response.status_code == 200
    data = response.json()
    assert "id" in data
    assert "url_id" in data


async def test_create_trip_invalid_input(client: AsyncClient):
    """
    POST /api/trips で不正な入力が与えられた場合に 422 が返ることを検証
    """
    # title が欠落している不正なデータ
    invalid_trip_data = {"detail": "missing title"}
    response = await client.post("/trips", json=invalid_trip_data)
    assert response.status_code == 422
    assert "detail" in response.json()
    assert any("title" in err["loc"] for err in response.json()["detail"])

    # title が max_length を超過している不正なデータ
    response = await client.post("/trips", json={"title": "a" * 201})
    assert response.status_code == 422
    assert any("title" in err["loc"] for err in response.json()["detail"])

    # detail が max_length を超過している不正なデータ
    response = await client.post("/trips", json={"title": "test", "detail": "a" * 2001})
    assert response.status_code == 422
    assert any("detail" in err["loc"] for err in response.json()["detail"])


async def test_read_trips(client: AsyncClient, db_session: AsyncSession):
    # 2つの旅行を作成
    await client.post("/trips", json={"title": "trip 1", "detail": "d1"})
    await client.post("/trips", json={"title": "trip 2", "detail": "d2"})

    # --- Read (Multiple) --- Basic認証が必要
    response = await client.get("/trips", auth=("admin", "admin"))
    assert response.status_code == 200
    data = response.json()
    # 既存のテストで作成されたデータも含まれる可能性があるため、2以上であることだけをチェック
    assert len(data) >= 2


async def test_get_trip_non_existent_id(client: AsyncClient, db_session: AsyncSession):
    """
    GET /trips/{trip_id} で存在しないIDが与えられた場合に
    Cookie に含まれていないため 403 が返ることを検証
    """
    response = await client.get("/trips/999")
    assert response.status_code == 403


async def test_get_trip_by_url_id_non_existent(
    client: AsyncClient, db_session: AsyncSession
):
    """
    GET /trips/url/{url_id} で存在しないURL IDが与えられた場合に 404 が返ることを検証
    """
    response = await client.get("/trips/url/non_existent_url")
    assert response.status_code == 404
    assert response.json()["message"] == "Trip not found"


async def test_update_trip(client: AsyncClient, db_session: AsyncSession):
    # 旅行を作成
    trip_data = {"title": "before update", "detail": "before"}
    response = await client.post("/trips", json=trip_data)
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


async def test_update_trip_non_existent_id(
    client: AsyncClient, db_session: AsyncSession
):
    """
    PUT /trips/{trip_id} で存在しないIDが与えられた場合に
    Cookie に含まれていないため 403 が返ることを検証
    """
    update_data = {"title": "non existent", "detail": "update"}
    response = await client.put("/trips/999", json=update_data)
    assert response.status_code == 403


async def test_update_trip_invalid_input(client: AsyncClient, db_session: AsyncSession):
    """
    PUT /trips/{trip_id} で不正な入力が与えられた場合に 422 が返ることを検証
    """
    trip_data = {"title": "test", "detail": "test"}
    response = await client.post("/trips", json=trip_data)
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
    response = await client.post("/trips", json=trip_data)
    trip_id = response.json()["id"]

    # --- Delete ---
    response = await client.delete(f"/trips/{trip_id}")
    assert response.status_code == 204

    # --- 削除されたことを確認 ---
    # 新方式では trip 削除で user_trip_access も CASCADE 削除されるため、
    # 認可チェックが先に落ちて 403 を返す（trip 存在チェックには到達しない）。
    # UX 上「削除後にアクセスできない」という意図は満たされる。
    response = await client.get(f"/trips/{trip_id}")
    assert response.status_code == 403


# ---- Cookie 発行テスト ----


async def test_create_trip_sets_access_cookie(
    client: AsyncClient, db_session: AsyncSession
):
    """POST /trips のレスポンスに session_id を持つ認可 Cookie が発行されることを検証"""
    response = await client.post("/trips", json={"title": "cookie test", "detail": "d"})
    assert response.status_code == 200
    trip_id = response.json()["id"]

    set_cookie_headers = response.headers.get_list("set-cookie")
    matching = [h for h in set_cookie_headers if SESSION_COOKIE_NAME in h]
    assert len(matching) == 1

    # 新形式 payload は session_id のみを持ち、trip_ids は載らない
    settings = get_settings()
    token = client.cookies.get(SESSION_COOKIE_NAME)
    payload = pyjwt.decode(token, settings.cookie_secret_key, algorithms=["HS256"])
    assert isinstance(payload.get("session_id"), str)
    assert "trip_ids" not in payload

    # 発行された Cookie で当該 trip にアクセスできる (認可が動く)
    read = await client.get(f"/trips/{trip_id}")
    assert read.status_code == 200


async def test_get_trip_by_url_id_sets_access_cookie(
    client: AsyncClient, db_session: AsyncSession
):
    """GET /trips/url/{url_id} のレスポンスに認可 Cookie が発行されることを検証"""
    response = await client.post(
        "/trips", json={"title": "url id cookie test", "detail": "d"}
    )
    trip_id = response.json()["id"]
    url_id = response.json()["url_id"]

    # 初回POST由来のCookieをクリアして、未認可状態のクライアントとして再利用する
    client.cookies.clear()
    response = await client.get(f"/trips/url/{url_id}")
    assert response.status_code == 200

    set_cookie_headers = response.headers.get_list("set-cookie")
    matching = [h for h in set_cookie_headers if SESSION_COOKIE_NAME in h]
    assert len(matching) == 1

    settings = get_settings()
    token = client.cookies.get(SESSION_COOKIE_NAME)
    payload = pyjwt.decode(token, settings.cookie_secret_key, algorithms=["HS256"])
    assert isinstance(payload.get("session_id"), str)

    # 発行された Cookie で当該 trip にアクセスできる
    read = await client.get(f"/trips/{trip_id}")
    assert read.status_code == 200


async def test_grant_trip_access_accumulates_multiple_trips(
    client: AsyncClient, db_session: AsyncSession
):
    """同一 session で複数 trip を作成した後、両方にアクセスできることを検証。

    旧方式の "trip_ids 配列にマージ" と違い、新方式では session 側は 1 個の session_id
    しか持たず、user_trip_access に (user, trip) 行が積み上がる。ここでは統合テストの
    観点として "複数 trip の認可が両方通る" ことだけを検証する。
    """
    r1 = await client.post("/trips", json={"title": "first", "detail": "d"})
    trip_id1 = r1.json()["id"]

    r2 = await client.post("/trips", json={"title": "second", "detail": "d"})
    trip_id2 = r2.json()["id"]

    # 同一 session (httpx client が Cookie を保持) で両方の trip にアクセス可能
    assert (await client.get(f"/trips/{trip_id1}")).status_code == 200
    assert (await client.get(f"/trips/{trip_id2}")).status_code == 200


# ---- 未認可アクセス 403 テスト ----


async def test_get_trip_without_cookie_returns_403(
    client: AsyncClient, db_session: AsyncSession, test_create_trip: Trip
):
    """実在するtripにCookieなしでアクセス → 403"""
    response = await client.get(f"/trips/{test_create_trip.id}")
    assert response.status_code == 403


async def test_update_trip_without_cookie_returns_403(
    client: AsyncClient, db_session: AsyncSession, test_create_trip: Trip
):
    """実在するtripをCookieなしで更新 → 403"""
    response = await client.put(
        f"/trips/{test_create_trip.id}", json={"title": "hacked"}
    )
    assert response.status_code == 403


async def test_delete_trip_without_cookie_returns_403(
    client: AsyncClient, db_session: AsyncSession, test_create_trip: Trip
):
    """実在するtripをCookieなしで削除 → 403"""
    response = await client.delete(f"/trips/{test_create_trip.id}")
    assert response.status_code == 403
