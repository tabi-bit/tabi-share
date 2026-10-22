"""ヘルスチェックのテスト"""

import time

import pytest
from httpx import AsyncClient

from app.config import get_settings

settings = get_settings()


async def test_health_ignores_delay_in_production(
    client: AsyncClient, monkeypatch: pytest.MonkeyPatch
):
    """本番では delay を無視する (認証なしで接続を占有させない)"""
    monkeypatch.setattr(settings, "environment", "production")
    started = time.monotonic()
    response = await client.get("/health", params={"delay": 2})
    assert response.status_code == 200
    assert time.monotonic() - started < 1


async def test_health_applies_delay_outside_production(client: AsyncClient):
    started = time.monotonic()
    response = await client.get("/health", params={"delay": 0.2})
    assert response.status_code == 200
    assert time.monotonic() - started >= 0.2
