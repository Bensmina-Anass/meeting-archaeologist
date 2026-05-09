from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, patch

import httpx
import pytest
import respx

from app.ingestion.teams.config import Settings
from app.ingestion.teams.transcripts import (
    list_meetings,
    list_transcripts,
    parse_window,
    run_ingestion,
)

GRAPH = "https://graph.microsoft.com/v1.0"


@pytest.fixture
def settings(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> Settings:
    monkeypatch.setenv("AZURE_TENANT_ID", "tenant")
    monkeypatch.setenv("AZURE_CLIENT_ID", "client-id")
    monkeypatch.setenv("AZURE_CLIENT_SECRET", "secret")
    monkeypatch.setenv("TEAMS_TARGET_USER_ID", "user-id")
    monkeypatch.setenv("INGESTION_BASE_DIR", str(tmp_path))
    return Settings()  # type: ignore[call-arg]


def _mock_msal() -> MagicMock:
    mock_app = MagicMock()
    mock_app.acquire_token_for_client.return_value = {
        "access_token": "tok",
        "expires_in": 3600,
    }
    return mock_app


_MEETING_PAYLOAD = {
    "id": "mtg-abc",
    "subject": "Sprint Review",
    "startDateTime": "2025-01-01T10:00:00Z",
    "endDateTime": "2025-01-01T11:00:00Z",
    "participants": {
        "organizer": {
            "identity": {"user": {"id": "u1", "displayName": "Alice"}},
        },
        "attendees": [
            {"identity": {"user": {"id": "u2", "displayName": "Bob"}}},
        ],
    },
}

_TRANSCRIPT_PAYLOAD = {
    "id": "trx-xyz",
    "createdDateTime": "2025-01-01T10:05:00Z",
}

VTT_CONTENT = b"WEBVTT\n\n00:00:01.000 --> 00:00:03.000\nHello world"


class TestParseWindow:
    def test_days(self) -> None:
        dt = parse_window("7d")
        assert (datetime.now(timezone.utc) - dt).total_seconds() == pytest.approx(
            7 * 86400, abs=5
        )

    def test_hours(self) -> None:
        dt = parse_window("24h")
        assert (datetime.now(timezone.utc) - dt).total_seconds() == pytest.approx(
            24 * 3600, abs=5
        )

    def test_iso_string(self) -> None:
        dt = parse_window("2025-01-01T00:00:00+00:00")
        assert dt == datetime(2025, 1, 1, tzinfo=timezone.utc)


class TestListMeetings:
    @respx.mock
    async def test_returns_meetings(self, settings: Settings) -> None:
        with patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=_mock_msal()):
            respx.get(f"{GRAPH}/users/user-id/onlineMeetings").mock(
                return_value=httpx.Response(200, json={"value": [_MEETING_PAYLOAD]})
            )
            from app.ingestion.teams.client import GraphClient

            since = datetime(2025, 1, 1, tzinfo=timezone.utc)
            until = datetime(2025, 1, 8, tzinfo=timezone.utc)
            async with GraphClient(settings) as client:
                meetings = await list_meetings(client, "user-id", since, until)

        assert len(meetings) == 1
        assert meetings[0].id == "mtg-abc"
        assert meetings[0].subject == "Sprint Review"
        assert meetings[0].participants.organizer.identity.user is not None
        assert meetings[0].participants.organizer.identity.user.id == "u1"

    @respx.mock
    async def test_handles_pagination(self, settings: Settings) -> None:
        with patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=_mock_msal()):
            page2_url = f"{GRAPH}/users/user-id/onlineMeetings?$skiptoken=abc"
            meeting2 = dict(_MEETING_PAYLOAD, id="mtg-page2")

            respx.get(f"{GRAPH}/users/user-id/onlineMeetings").mock(
                return_value=httpx.Response(
                    200,
                    json={"value": [_MEETING_PAYLOAD], "@odata.nextLink": page2_url},
                )
            )
            respx.get(page2_url).mock(
                return_value=httpx.Response(200, json={"value": [meeting2]})
            )

            from app.ingestion.teams.client import GraphClient

            since = datetime(2025, 1, 1, tzinfo=timezone.utc)
            until = datetime(2025, 1, 8, tzinfo=timezone.utc)
            async with GraphClient(settings) as client:
                meetings = await list_meetings(client, "user-id", since, until)

        assert len(meetings) == 2
        assert {m.id for m in meetings} == {"mtg-abc", "mtg-page2"}


class TestListTranscripts:
    @respx.mock
    async def test_returns_transcripts(self, settings: Settings) -> None:
        with patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=_mock_msal()):
            respx.get(f"{GRAPH}/users/user-id/onlineMeetings/mtg-abc/transcripts").mock(
                return_value=httpx.Response(200, json={"value": [_TRANSCRIPT_PAYLOAD]})
            )
            from app.ingestion.teams.client import GraphClient

            async with GraphClient(settings) as client:
                transcripts = await list_transcripts(client, "user-id", "mtg-abc")

        assert len(transcripts) == 1
        assert transcripts[0].id == "trx-xyz"

    @respx.mock
    async def test_returns_empty_on_error(self, settings: Settings) -> None:
        with patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=_mock_msal()):
            respx.get(f"{GRAPH}/users/user-id/onlineMeetings/no-trx/transcripts").mock(
                return_value=httpx.Response(404, json={"error": {"code": "NotFound"}})
            )
            from app.ingestion.teams.client import GraphClient

            async with GraphClient(settings) as client:
                transcripts = await list_transcripts(client, "user-id", "no-trx")

        assert transcripts == []


def _mock_session() -> MagicMock:
    """Stub DB session: meeting not yet extracted, no open Postgres connection."""
    session = MagicMock()
    session.get.return_value = None
    return session


class TestRunIngestion:
    @respx.mock
    async def test_full_run_writes_files(self, settings: Settings, tmp_path: Path) -> None:
        with (
            patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=_mock_msal()),
            patch("app.db.SessionLocal", return_value=_mock_session()),
            patch("app.ingestion.pipeline.ingest_transcript_text"),
        ):
            respx.get(f"{GRAPH}/users/user-id/onlineMeetings").mock(
                return_value=httpx.Response(200, json={"value": [_MEETING_PAYLOAD]})
            )
            respx.get(f"{GRAPH}/users/user-id/onlineMeetings/mtg-abc/transcripts").mock(
                return_value=httpx.Response(200, json={"value": [_TRANSCRIPT_PAYLOAD]})
            )
            respx.get(
                f"{GRAPH}/users/user-id/onlineMeetings/mtg-abc/transcripts/trx-xyz/content"
            ).mock(return_value=httpx.Response(200, content=VTT_CONTENT))

            since = datetime(2025, 1, 1, tzinfo=timezone.utc)
            stats = await run_ingestion(settings, since)

        assert stats.meetings_found == 1
        assert stats.written == 1
        assert stats.skipped == 0

        vtt_file = next(tmp_path.rglob("*.vtt"))
        assert vtt_file.read_bytes() == VTT_CONTENT

        meta_file = next(tmp_path.rglob("metadata.json"))
        meta = json.loads(meta_file.read_text())
        assert meta["meeting_id"] == "mtg-abc"
        assert meta["subject"] == "Sprint Review"
        assert len(meta["transcripts"]) == 1

    @respx.mock
    async def test_idempotent_run_skips_existing(
        self, settings: Settings, tmp_path: Path
    ) -> None:
        with (
            patch("app.ingestion.teams.client.msal.ConfidentialClientApplication", return_value=_mock_msal()),
            patch("app.db.SessionLocal", return_value=_mock_session()),
            patch("app.ingestion.pipeline.ingest_transcript_text"),
        ):
            respx.get(f"{GRAPH}/users/user-id/onlineMeetings").mock(
                return_value=httpx.Response(200, json={"value": [_MEETING_PAYLOAD]})
            )
            respx.get(f"{GRAPH}/users/user-id/onlineMeetings/mtg-abc/transcripts").mock(
                return_value=httpx.Response(200, json={"value": [_TRANSCRIPT_PAYLOAD]})
            )
            respx.get(
                f"{GRAPH}/users/user-id/onlineMeetings/mtg-abc/transcripts/trx-xyz/content"
            ).mock(return_value=httpx.Response(200, content=VTT_CONTENT))

            since = datetime(2025, 1, 1, tzinfo=timezone.utc)

            # First run — writes the file.
            await run_ingestion(settings, since)
            # Second run — should skip, not re-download.
            stats = await run_ingestion(settings, since)

        assert stats.written == 0
        assert stats.skipped == 1
