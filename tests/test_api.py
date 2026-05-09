from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import MagicMock

import pytest
from fastapi.testclient import TestClient

from app.db.session import get_db
from app.main import app

# ── Shared mock session ───────────────────────────────────────────────────────
# A module-level mock so tests can configure return values before the request.

_mock_db = MagicMock()


def _stub_db():
    yield _mock_db


@pytest.fixture(autouse=True)
def mock_db():
    _mock_db.reset_mock()
    # Sensible defaults: nothing in DB, get() returns None → all single-object
    # routes return 404 by default; list routes return empty collections.
    _mock_db.get.return_value = None
    _mock_db.execute.return_value.scalar_one.return_value = 0
    _mock_db.execute.return_value.all.return_value = []
    _mock_db.execute.return_value.scalars.return_value = iter([])
    app.dependency_overrides[get_db] = _stub_db
    yield _mock_db
    app.dependency_overrides.clear()


client = TestClient(app, raise_server_exceptions=True)


# ── Topics ────────────────────────────────────────────────────────────────────

class TestTopicsRoute:
    def test_list_topics_empty(self):
        resp = client.get("/topics")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_get_topic_not_found(self):
        resp = client.get(f"/topics/{uuid.uuid4()}")
        assert resp.status_code == 404
        assert "not found" in resp.json()["detail"].lower()

    def test_list_topic_decisions_not_found(self):
        resp = client.get(f"/topics/{uuid.uuid4()}/decisions")
        assert resp.status_code == 404


# ── Meetings ──────────────────────────────────────────────────────────────────

class TestMeetingsRoute:
    def test_list_meetings_empty(self):
        resp = client.get("/meetings")
        assert resp.status_code == 200
        body = resp.json()
        assert body["total"] == 0
        assert body["items"] == []
        assert body["page"] == 1
        assert body["page_size"] == 50

    def test_get_meeting_not_found(self):
        resp = client.get("/meetings/nonexistent")
        assert resp.status_code == 404

    def test_list_meetings_pagination_params(self):
        resp = client.get("/meetings?page=2&page_size=10")
        assert resp.status_code == 200
        body = resp.json()
        assert body["page"] == 2
        assert body["page_size"] == 10


# ── Contradictions ────────────────────────────────────────────────────────────

class TestContradictionsRoute:
    def test_list_contradictions_empty(self):
        resp = client.get("/contradictions")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_dismiss_not_found(self):
        resp = client.post(f"/contradictions/{uuid.uuid4()}/dismiss")
        assert resp.status_code == 404
