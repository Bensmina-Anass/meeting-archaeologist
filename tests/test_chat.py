from __future__ import annotations

from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.db.session import get_db
from app.main import app

_mock_db = MagicMock()


def _stub_db():
    yield _mock_db


@pytest.fixture(autouse=True)
def mock_db():
    _mock_db.reset_mock()
    _mock_db.get.return_value = None
    _mock_db.execute.return_value.scalars.return_value.all.return_value = []
    _mock_db.execute.return_value.all.return_value = []
    app.dependency_overrides[get_db] = _stub_db
    yield _mock_db
    app.dependency_overrides.clear()


client = TestClient(app, raise_server_exceptions=True)

_VALID_BODY = {"messages": [{"role": "user", "content": "What was decided?"}]}


class TestChatRoute:
    def test_meeting_not_found(self):
        resp = client.post("/meetings/nonexistent/chat", json=_VALID_BODY)
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_empty_messages_rejected(self, mock_db):
        meeting = MagicMock()
        meeting.started_at = datetime(2025, 9, 2, tzinfo=timezone.utc)
        meeting.attendees = ["Sara"]
        meeting.transcript = "Sara: Decision: use Auth0."
        mock_db.get.return_value = meeting

        resp = client.post("/meetings/mtg_01/chat", json={"messages": []})
        assert resp.status_code == 422

    def test_streams_response(self, mock_db):
        meeting = MagicMock()
        meeting.title = "Auth Kickoff"
        meeting.started_at = datetime(2025, 9, 2, tzinfo=timezone.utc)
        meeting.attendees = ["Sara", "Marc"]
        meeting.transcript = "Sara: Decision: we go with Auth0."
        mock_db.get.return_value = meeting
        mock_db.execute.return_value.all.return_value = []
        mock_db.execute.return_value.scalars.return_value.all.return_value = []

        async def _fake_stream():
            for chunk in ["Auth0 ", "was chosen."]:
                mock_chunk = MagicMock()
                mock_chunk.text = chunk
                yield mock_chunk

        with patch("app.api.routes.chat.genai.Client") as MockClient:
            mock_instance = MockClient.return_value
            mock_instance.aio.models.generate_content_stream = AsyncMock(
                return_value=_fake_stream()
            )
            resp = client.post("/meetings/mtg_01/chat", json=_VALID_BODY)

        assert resp.status_code == 200
        assert "Auth0" in resp.text
        assert resp.headers["content-type"].startswith("text/plain")
