"""状態を変えるリクエストの送信元検証ミドルウェアのテスト"""

import pytest
from httpx import AsyncClient

from app.config import get_settings

settings = get_settings()

_TRIP_BODY = {"title": "送信元検証"}


@pytest.mark.parametrize(
    "headers",
    [
        {"origin": "http://localhost:5173"},
        {"origin": "https://tabi-share-8ef6b--pr246-chore-xyz.web.app"},
        # Origin を付けないサーバー間通信 (Cloud Scheduler など)
        {},
        {"sec-fetch-site": "same-site"},
    ],
)
async def test_allows_trusted_source(client: AsyncClient, headers: dict[str, str]):
    response = await client.post("/trips", json=_TRIP_BODY, headers=headers)
    assert response.status_code == 200


@pytest.mark.parametrize(
    "headers",
    [
        {"origin": "https://evil.example"},
        {"origin": "null"},
        {"sec-fetch-site": "cross-site"},
    ],
)
async def test_rejects_untrusted_source(client: AsyncClient, headers: dict[str, str]):
    response = await client.post("/trips", json=_TRIP_BODY, headers=headers)
    assert response.status_code == 403
    assert response.json()["code"] == "forbidden_origin"
    assert "set-cookie" not in response.headers


async def test_rejects_body_without_content_type_from_other_site(client: AsyncClient):
    """Content-Type なしの JSON はプリフライトを経ずに届くため、Origin で止める"""
    response = await client.post(
        "/auth/link",
        content=b'{"id_token": "x"}',
        headers={"origin": "https://evil.example"},
    )
    assert response.status_code == 403


async def test_does_not_check_safe_methods(client: AsyncClient):
    response = await client.get("/me/trips", headers={"origin": "https://evil.example"})
    assert response.status_code == 200


async def test_production_rejects_preview_origin(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    """プレビューはステージング API を使うため、本番 API では許可しない"""
    monkeypatch.setattr(settings, "environment", "production")
    response = await client.post(
        "/trips",
        json=_TRIP_BODY,
        headers={"origin": "https://tabi-share-8ef6b--pr246-chore-xyz.web.app"},
    )
    assert response.status_code == 403
