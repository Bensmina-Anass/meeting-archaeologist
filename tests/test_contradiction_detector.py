from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any
from unittest.mock import MagicMock, patch

import pytest

from app.agents.contradiction_detector import _DetectionResult, _ContradictionMatch


def _make_decision(
    id: uuid.UUID | None = None,
    meeting_id: str = "meeting_01",
    topic_id: uuid.UUID | None = None,
    summary: str = "Adopted single-cloud AWS.",
) -> MagicMock:
    d = MagicMock()
    d.id = id or uuid.uuid4()
    d.meeting_id = meeting_id
    d.topic_id = topic_id or uuid.uuid4()
    d.summary = summary
    d.created_at = datetime.now(timezone.utc)
    return d


def _make_topic(slug: str = "cloud_provider") -> MagicMock:
    t = MagicMock()
    t.id = uuid.uuid4()
    t.slug = slug
    return t


class TestDetectContradictions:
    def test_no_prior_decisions_returns_empty(self):
        """When there are no prior decisions, skip the LLM call entirely."""
        from app.agents.contradiction_detector import detect_contradictions

        db = MagicMock()
        db.execute.return_value.scalars.return_value = iter([])

        topic = _make_topic()
        new_decision = _make_decision(topic_id=topic.id)

        result = detect_contradictions(new_decision, topic, db)

        assert result == []
        # No LLM call should have been made
        db.add.assert_not_called()

    def test_contradiction_persisted_when_detected(self):
        """When the LLM returns a contradiction match, it must be persisted."""
        from app.agents.contradiction_detector import detect_contradictions

        prior_id = uuid.uuid4()
        prior_decision = _make_decision(
            id=prior_id,
            meeting_id="meeting_02",
            summary="Adopted single-cloud AWS.",
        )
        new_decision = _make_decision(
            meeting_id="meeting_05",
            summary="Adopted multi-cloud Kubernetes with AWS EKS and GCP GKE.",
        )
        topic = _make_topic(slug="cloud_provider")

        db = MagicMock()
        # Simulate one prior decision in the DB
        db.execute.return_value.scalars.return_value = iter([prior_decision])

        gemini_response = _DetectionResult(
            contradictions=[
                _ContradictionMatch(
                    prior_decision_index=0,
                    explanation="Single-cloud vs multi-cloud are mutually exclusive.",
                    severity="high",
                )
            ]
        )

        with patch(
            "app.agents.contradiction_detector._make_client"
        ) as mock_client_factory:
            mock_client = MagicMock()
            mock_client_factory.return_value = mock_client
            mock_client.chat.completions.create.return_value = gemini_response

            result = detect_contradictions(new_decision, topic, db)

        assert len(result) == 1
        db.add.assert_called_once()
        added = db.add.call_args[0][0]
        assert added.decision_a_id == prior_id
        assert added.decision_b_id == new_decision.id
        assert added.severity == "high"
        db.flush.assert_called()

    def test_llm_receives_prior_summaries_in_prompt(self):
        """The user prompt sent to Gemini must include the prior decision summary."""
        from app.agents.contradiction_detector import detect_contradictions

        prior = _make_decision(summary="Adopted REST API; no GraphQL.")
        new_decision = _make_decision(summary="Adopted GraphQL for the API layer.")
        topic = _make_topic(slug="api_style")

        db = MagicMock()
        db.execute.return_value.scalars.return_value = iter([prior])

        with patch(
            "app.agents.contradiction_detector._make_client"
        ) as mock_client_factory:
            mock_client = MagicMock()
            mock_client_factory.return_value = mock_client
            mock_client.chat.completions.create.return_value = _DetectionResult(
                contradictions=[]
            )

            detect_contradictions(new_decision, topic, db)

        call_kwargs = mock_client.chat.completions.create.call_args
        messages: list[dict[str, Any]] = call_kwargs.kwargs.get(
            "messages", call_kwargs.args[0] if call_kwargs.args else []
        )
        # Flatten all message content for inspection
        all_content = " ".join(m.get("content", "") for m in messages)
        assert "REST API" in all_content
        assert "GraphQL" in all_content

    def test_out_of_range_index_skipped(self):
        """An LLM-returned index beyond the prior list must be silently ignored."""
        from app.agents.contradiction_detector import detect_contradictions

        prior = _make_decision()
        new_decision = _make_decision()
        topic = _make_topic()

        db = MagicMock()
        db.execute.return_value.scalars.return_value = iter([prior])

        bad_response = _DetectionResult(
            contradictions=[
                _ContradictionMatch(
                    prior_decision_index=99,  # out of range
                    explanation="bogus",
                    severity="low",
                )
            ]
        )

        with patch("app.agents.contradiction_detector._make_client") as mock_factory:
            mock_client = MagicMock()
            mock_factory.return_value = mock_client
            mock_client.chat.completions.create.return_value = bad_response

            result = detect_contradictions(new_decision, topic, db)

        assert result == []
        db.add.assert_not_called()
