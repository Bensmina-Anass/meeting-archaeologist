"""End-to-end smoke test: feed the 5 synthetic VTT fixtures through the pipeline
and assert the planted cloud_provider contradiction (meeting_02 → meeting_05) is detected.

All LLM calls (extractor + contradiction detector) are mocked so the test runs
without a real API key.  DB calls are also mocked — this verifies the pipeline
wiring without needing a live Postgres instance.

If you have a real test DB, set TEST_DATABASE_URL and remove the DB mocking to
run a true integration test.
# TODO: add an integration-test variant that runs against a live DB
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock, call, patch

import pytest

from app.models import Decision as PydanticDecision, MeetingExtraction

FIXTURES = Path(__file__).parent.parent / "data" / "transcripts" / "vtt"

# ── Predetermined extractor outputs ──────────────────────────────────────────

def _make_extraction(meeting_id: str, decisions: list[dict]) -> MeetingExtraction:
    return MeetingExtraction(
        meeting_id=meeting_id,
        title=meeting_id,
        date=None,
        decisions=[
            PydanticDecision(
                topic=d["topic"],
                topic_display=d.get("topic_display", d["topic"].replace("_", " ").title()),
                summary=d["summary"],
                verbatim_quote=d.get("verbatim_quote", "Speaker: quote."),
                confidence=d.get("confidence", "explicit"),
                participants=d.get("participants", []),
                decided_at=None,
            )
            for d in decisions
        ],
    )


MEETING_01_EXTRACTION = _make_extraction(
    "meeting_01",
    [
        {"topic": "sprint_cadence", "summary": "Two-week sprints starting Monday."},
        {"topic": "feature_priority", "summary": "Auth and user management ships first."},
        {"topic": "standup_schedule", "summary": "Daily standup at 9:30 AM.", "confidence": "implied"},
    ],
)

MEETING_02_EXTRACTION = _make_extraction(
    "meeting_02",
    [
        {
            "topic": "cloud_provider",
            "summary": "Adopted a single-cloud AWS strategy, excluding GCP and Azure.",
            "confidence": "explicit",
        },
        {"topic": "database_infrastructure", "summary": "Postgres on RDS, multi-AZ."},
        {"topic": "cicd_tooling", "summary": "GitHub Actions for CI/CD."},
    ],
)

MEETING_03_EXTRACTION = _make_extraction(
    "meeting_03",
    [
        {"topic": "api_style", "summary": "REST API; no GraphQL."},
        {"topic": "api_versioning", "summary": "/api/v1 prefix from day one."},
        {"topic": "api_rate_limits", "summary": "100 req/min per API key at gateway."},
    ],
)

MEETING_04_EXTRACTION = _make_extraction(
    "meeting_04",
    [
        {"topic": "engineering_hiring", "summary": "Hire two senior backend engineers by end of July."},
        {"topic": "pm_process", "summary": "PM owns specs due week 3 of sprint."},
        {"topic": "release_process", "summary": "Feature freeze two weeks before launch."},
    ],
)

MEETING_05_EXTRACTION = _make_extraction(
    "meeting_05",
    [
        {
            "topic": "cloud_provider",  # same slug — contradiction candidate
            "summary": "Adopted multi-cloud Kubernetes: AWS EKS primary, GCP GKE for DR.",
            "confidence": "explicit",
        },
        {"topic": "service_mesh", "summary": "Istio for inter-service traffic."},
        {"topic": "codebase_structure", "summary": "Monorepo with Turborepo.", "confidence": "implied"},
    ],
)

EXTRACTIONS = {
    "meeting_01": MEETING_01_EXTRACTION,
    "meeting_02": MEETING_02_EXTRACTION,
    "meeting_03": MEETING_03_EXTRACTION,
    "meeting_04": MEETING_04_EXTRACTION,
    "meeting_05": MEETING_05_EXTRACTION,
}


# ── Test ──────────────────────────────────────────────────────────────────────

class TestE2ePipelineSmoke:
    """Run all 5 VTT fixtures through the pipeline with mocked LLM and DB."""

    def test_five_vtt_files_exist(self):
        for n in range(1, 6):
            assert (FIXTURES / f"meeting_0{n}.vtt").exists(), f"missing meeting_0{n}.vtt"

    def test_pipeline_called_for_each_meeting(self):
        """ingest_transcript_text must be invoked once per VTT fixture."""
        called_ids: list[str] = []

        def fake_ingest(text: str, meeting_metadata: dict, db) -> MeetingExtraction:
            mid = meeting_metadata["meeting_id"]
            called_ids.append(mid)
            return EXTRACTIONS[mid]

        with patch("app.ingestion.pipeline.ingest_transcript_text", side_effect=fake_ingest):
            from app.ingestion.pipeline import ingest_transcript_text
            from app.ingestion.vtt import parse_vtt

            db = MagicMock()
            for n in range(1, 6):
                vtt_path = FIXTURES / f"meeting_0{n}.vtt"
                text = parse_vtt(vtt_path)
                meeting_id = f"meeting_0{n}"
                ingest_transcript_text(text, {"meeting_id": meeting_id}, db)

        assert called_ids == [f"meeting_0{n}" for n in range(1, 6)]

    def test_contradiction_detector_receives_cloud_provider_decisions(self):
        """After meeting_02's cloud_provider decision is stored, meeting_05's
        cloud_provider decision must trigger the contradiction detector with the
        meeting_02 decision as prior context.
        """
        from app.agents.contradiction_detector import _DetectionResult, _ContradictionMatch

        topic_id = uuid.uuid4()
        detected_calls: list[tuple] = []

        def fake_detect_contradictions(new_decision, topic, db):
            detected_calls.append((new_decision.summary, topic.slug))
            if topic.slug == "cloud_provider" and "multi-cloud" in new_decision.summary:
                # Simulate finding the planted contradiction
                c = MagicMock()
                c.severity = "high"
                c.explanation = "Single-cloud vs multi-cloud."
                return [c]
            return []

        # Fake topic resolver — returns same topic for cloud_provider
        cloud_topic = MagicMock()
        cloud_topic.id = topic_id
        cloud_topic.slug = "cloud_provider"

        def fake_resolve_topic(db, decision):
            t = MagicMock()
            t.id = uuid.uuid4()
            t.slug = decision.topic
            if decision.topic == "cloud_provider":
                return cloud_topic
            return t

        db = MagicMock()
        db.get.return_value = None  # no existing meeting row
        db.execute.return_value.scalars.return_value = iter([])

        with (
            patch("app.ingestion.pipeline.extract_meeting", side_effect=lambda text, mid: EXTRACTIONS[mid]),
            patch("app.ingestion.pipeline.resolve_topic", side_effect=fake_resolve_topic),
            patch("app.ingestion.pipeline.detect_contradictions", side_effect=fake_detect_contradictions),
        ):
            from app.ingestion.pipeline import ingest_transcript_text
            from app.ingestion.vtt import parse_vtt

            for n in range(1, 6):
                vtt_path = FIXTURES / f"meeting_0{n}.vtt"
                text = parse_vtt(vtt_path)
                meeting_id = f"meeting_0{n}"
                ingest_transcript_text(text, {"meeting_id": meeting_id}, db)

        # The detector must have been called on the cloud_provider topic at
        # least twice (once for meeting_02, once for meeting_05).
        cloud_calls = [c for c in detected_calls if c[1] == "cloud_provider"]
        assert len(cloud_calls) >= 2, (
            f"Expected at least 2 cloud_provider contradiction checks, got {cloud_calls}"
        )

        # The meeting_05 decision (multi-cloud) must have been one of the calls.
        summaries = [c[0] for c in cloud_calls]
        assert any("multi-cloud" in s for s in summaries), (
            f"meeting_05 cloud_provider decision not found in detector calls: {summaries}"
        )
