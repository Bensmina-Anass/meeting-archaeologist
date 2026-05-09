from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx
import msal  # type: ignore[import-untyped]
import structlog

from app.ingestion.teams.config import Settings

log = structlog.get_logger(__name__)

GRAPH_BASE = "https://graph.microsoft.com/v1.0"
_SCOPES = ["https://graph.microsoft.com/.default"]
_MAX_RETRIES = 5


class GraphClient:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._http = httpx.AsyncClient(timeout=30.0)
        self._token: str | None = None
        self._token_expiry: float = 0.0
        self._msal_app: Any = msal.ConfidentialClientApplication(
            client_id=settings.azure_client_id,
            client_credential=settings.azure_client_secret,
            authority=f"https://login.microsoftonline.com/{settings.azure_tenant_id}",
        )

    async def __aenter__(self) -> GraphClient:
        return self

    async def __aexit__(self, *_: object) -> None:
        await self._http.aclose()

    def _acquire_token(self) -> str:
        now = time.monotonic()
        if self._token and now < self._token_expiry:
            return self._token

        log.info("acquiring_token", tenant=self._settings.azure_tenant_id)
        result: dict[str, Any] = self._msal_app.acquire_token_for_client(scopes=_SCOPES)
        if "access_token" not in result:
            raise RuntimeError(
                f"MSAL token acquisition failed: {result.get('error_description', result)}"
            )

        self._token = str(result["access_token"])
        # Buffer 60 s so we refresh before actual expiry.
        self._token_expiry = now + float(result.get("expires_in", 3600)) - 60.0
        log.info("token_acquired", expires_in=result.get("expires_in"))
        return self._token

    async def _send(self, method: str, url: str, **kwargs: Any) -> httpx.Response:
        for attempt in range(_MAX_RETRIES + 1):
            token = self._acquire_token()
            log.info("graph_request", method=method, url=url, attempt=attempt)
            response = await self._http.request(
                method,
                url,
                headers={"Authorization": f"Bearer {token}"},
                **kwargs,
            )

            if response.status_code == 429:
                retry_after = int(response.headers.get("Retry-After", 2**attempt))
                log.warning("throttled", retry_after=retry_after, attempt=attempt)
                if attempt == _MAX_RETRIES:
                    response.raise_for_status()
                await asyncio.sleep(retry_after)
                continue

            log.info("graph_response", status=response.status_code, url=url)
            response.raise_for_status()
            return response

        raise RuntimeError("Max retries exceeded")  # unreachable; satisfies mypy

    async def get(self, path: str, **params: str) -> dict[str, Any]:
        url = path if path.startswith("https://") else f"{GRAPH_BASE}{path}"
        response = await self._send("GET", url, params=params or None)
        result: dict[str, Any] = response.json()
        return result

    async def get_bytes(self, path: str, **params: str) -> bytes:
        url = path if path.startswith("https://") else f"{GRAPH_BASE}{path}"
        response = await self._send("GET", url, params=params or None)
        return response.content
