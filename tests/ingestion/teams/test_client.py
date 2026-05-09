from __future__ import annotations

from typing import Any
from unittest.mock import MagicMock, patch

import httpx
import pytest
import respx

from app.ingestion.teams.client import GraphClient, _MAX_RETRIES
from app.ingestion.teams.config import Settings


@pytest.fixture
def settings(monkeypatch: pytest.MonkeyPatch) -> Settings:
    monkeypatch.setenv("AZURE_TENANT_ID", "test-tenant")
    monkeypatch.setenv("AZURE_CLIENT_ID", "test-client-id")
    monkeypatch.setenv("AZURE_CLIENT_SECRET", "test-secret")
    monkeypatch.setenv("TEAMS_TARGET_USER_ID", "test-user-id")
    return Settings()  # type: ignore[call-arg]


def _mock_msal(token: str = "test-token", expires_in: int = 3600) -> MagicMock:
    mock_app = MagicMock()
    mock_app.acquire_token_for_client.return_value = {
        "access_token": token,
        "expires_in": expires_in,
    }
    return mock_app


class TestTokenAcquisition:
    @respx.mock
    async def test_token_acquired_and_used(self, settings: Settings) -> None:
        mock_app = _mock_msal()
        with patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=mock_app):
            respx.get("https://graph.microsoft.com/v1.0/test").mock(
                return_value=httpx.Response(200, json={"value": []})
            )
            async with GraphClient(settings) as client:
                await client.get("/test")

        mock_app.acquire_token_for_client.assert_called_once()

    @respx.mock
    async def test_token_cached_across_requests(self, settings: Settings) -> None:
        mock_app = _mock_msal()
        with patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=mock_app):
            respx.get("https://graph.microsoft.com/v1.0/test").mock(
                return_value=httpx.Response(200, json={"ok": True})
            )
            async with GraphClient(settings) as client:
                await client.get("/test")
                await client.get("/test")

        # Second call should reuse the cached token, not call MSAL again.
        assert mock_app.acquire_token_for_client.call_count == 1

    async def test_msal_failure_raises(self, settings: Settings) -> None:
        mock_app = MagicMock()
        mock_app.acquire_token_for_client.return_value = {
            "error": "invalid_client",
            "error_description": "Bad credentials",
        }
        with patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=mock_app):
            async with GraphClient(settings) as client:
                with pytest.raises(RuntimeError, match="MSAL token acquisition failed"):
                    client._acquire_token()


class TestThrottling:
    @respx.mock
    async def test_retries_on_429(self, settings: Settings) -> None:
        mock_app = _mock_msal()
        with patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=mock_app):
            route = respx.get("https://graph.microsoft.com/v1.0/test")
            route.side_effect = [
                httpx.Response(429, headers={"Retry-After": "0"}),
                httpx.Response(200, json={"value": "ok"}),
            ]
            with patch("asyncio.sleep") as mock_sleep:
                async with GraphClient(settings) as client:
                    result = await client.get("/test")

        assert result == {"value": "ok"}
        mock_sleep.assert_called_once_with(0)

    @respx.mock
    async def test_respects_retry_after_header(self, settings: Settings) -> None:
        mock_app = _mock_msal()
        with patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=mock_app):
            route = respx.get("https://graph.microsoft.com/v1.0/test")
            route.side_effect = [
                httpx.Response(429, headers={"Retry-After": "42"}),
                httpx.Response(200, json={}),
            ]
            with patch("asyncio.sleep") as mock_sleep:
                async with GraphClient(settings) as client:
                    await client.get("/test")

        mock_sleep.assert_called_once_with(42)

    @respx.mock
    async def test_raises_after_max_retries(self, settings: Settings) -> None:
        mock_app = _mock_msal()
        with patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=mock_app):
            respx.get("https://graph.microsoft.com/v1.0/test").mock(
                return_value=httpx.Response(429, headers={"Retry-After": "0"})
            )
            with patch("asyncio.sleep"):
                async with GraphClient(settings) as client:
                    with pytest.raises(httpx.HTTPStatusError):
                        await client.get("/test")


class TestGetBytes:
    @respx.mock
    async def test_returns_raw_bytes(self, settings: Settings) -> None:
        mock_app = _mock_msal()
        with patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=mock_app):
            vtt_content = b"WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello"
            respx.get("https://graph.microsoft.com/v1.0/test/content").mock(
                return_value=httpx.Response(200, content=vtt_content)
            )
            async with GraphClient(settings) as client:
                result = await client.get_bytes("/test/content")

        assert result == vtt_content
