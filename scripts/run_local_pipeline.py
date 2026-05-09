"""Run all 5 VTT fixtures through the pipeline against a clean local test DB,
then print GET /meetings, /topics, /contradictions JSON.

Usage:
    DATABASE_URL=postgresql://test:test@localhost:15432/test \
    GOOGLE_API_KEY=dummy \
    .venv/bin/python scripts/run_local_pipeline.py
"""
from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path
from unittest.mock import patch

# ── point at the test DB before any app module is imported ────────────────────
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost:15432/test")
os.environ.setdefault("GOOGLE_API_KEY", "dummy")
os.environ.setdefault("TOPIC_SIMILARITY_THRESHOLD", "0.85")

# ── app imports (after env is set) ────────────────────────────────────────────
from sqlalchemy import create_engine, text as sa_text
from sqlalchemy.orm import sessionmaker

from app.db.models import Base
from app.ingestion.pipeline import ingest_transcript_text
from app.ingestion.vtt import parse_vtt
from app.models import Decision as PydanticDecision, MeetingExtraction

FIXTURES = Path(__file__).parent.parent / "data" / "transcripts" / "vtt"
DB_URL = os.environ["DATABASE_URL"]

# ── deterministic embeddings (768-dim unit vector keyed by topic slug) ────────

def _fake_embed(text: str) -> list[float]:
    """Return a 768-dim unit vector stable per topic slug.

    resolve_topic builds the anchor as "<slug>: <summary>", so we key only on
    the part before the first colon — same slug always produces the same vector
    (cosine similarity 1.0), different slugs produce near-orthogonal vectors.
    """
    import numpy as np
    key = text.split(":")[0].strip()
    digest = hashlib.sha256(key.encode()).digest()
    rng = np.random.default_rng(int.from_bytes(digest[:8], "big"))
    v = rng.standard_normal(768).astype(float)
    return (v / (float(np.linalg.norm(v)) or 1.0)).tolist()


# ── predefined LLM extractions ────────────────────────────────────────────────

def _decision(topic: str, summary: str, confidence: str = "explicit",
              quote: str | None = None) -> PydanticDecision:
    return PydanticDecision(
        topic=topic,
        topic_display=topic.replace("_", " ").title(),
        summary=summary,
        verbatim_quote=quote or f"Speaker: {summary}",
        confidence=confidence,
        participants=[],
        decided_at=None,
    )


EXTRACTIONS: dict[str, MeetingExtraction] = {
    "meeting_01": MeetingExtraction(
        meeting_id="meeting_01", title="Auth Kickoff", date=None,
        decisions=[
            _decision("sprint_cadence", "Two-week sprints starting Monday."),
            _decision("feature_priority", "Auth and user management ships first."),
            _decision("standup_schedule", "Daily standup at 9:30 AM.", "implied"),
        ],
    ),
    "meeting_02": MeetingExtraction(
        meeting_id="meeting_02", title="Infrastructure Planning", date=None,
        decisions=[
            _decision("cloud_provider",
                      "Adopted a single-cloud AWS strategy, excluding GCP and Azure."),
            _decision("database_infrastructure", "Postgres on RDS, multi-AZ."),
            _decision("cicd_tooling", "GitHub Actions for CI/CD."),
        ],
    ),
    "meeting_03": MeetingExtraction(
        meeting_id="meeting_03", title="API Design", date=None,
        decisions=[
            _decision("api_style", "REST API; no GraphQL."),
            _decision("api_versioning", "/api/v1 prefix from day one."),
            _decision("api_rate_limits", "100 req/min per API key at gateway."),
        ],
    ),
    "meeting_04": MeetingExtraction(
        meeting_id="meeting_04", title="Team & Process", date=None,
        decisions=[
            _decision("engineering_hiring",
                      "Hire two senior backend engineers by end of July."),
            _decision("pm_process", "PM owns specs due week 3 of sprint."),
            _decision("release_process", "Feature freeze two weeks before launch."),
        ],
    ),
    "meeting_05": MeetingExtraction(
        meeting_id="meeting_05", title="Platform Evolution", date=None,
        decisions=[
            _decision("cloud_provider",
                      "Adopted multi-cloud Kubernetes: AWS EKS primary, GCP GKE for DR."),
            _decision("service_mesh", "Istio for inter-service traffic."),
            _decision("codebase_structure", "Monorepo with Turborepo.", "implied"),
        ],
    ),
}


# ── fake contradiction detector ───────────────────────────────────────────────

from app.db.models import Contradiction as DBContradiction, Decision as DBDecision, Topic

_CLOUD_CONTRADICTION = {
    "single": "Adopted a single-cloud AWS strategy, excluding GCP and Azure.",
    "multi":  "Adopted multi-cloud Kubernetes: AWS EKS primary, GCP GKE for DR.",
    "explanation": (
        "Meeting 02 explicitly adopted single-cloud AWS and excluded GCP. "
        "Meeting 05 reverses this by adopting multi-cloud Kubernetes with GCP GKE as DR."
    ),
    "severity": "high",
}


def _fake_detect(new_decision: DBDecision, topic: Topic, db):
    from sqlalchemy import select as sa_select

    prior: list[DBDecision] = list(
        db.execute(
            sa_select(DBDecision)
            .where(DBDecision.topic_id == topic.id)
            .where(DBDecision.id != new_decision.id)
            .order_by(DBDecision.created_at)
        ).scalars()
    )
    if not prior:
        return []

    created = []
    if topic.slug == "cloud_provider":
        for p in prior:
            if (
                "single-cloud" in p.summary and "multi-cloud" in new_decision.summary
            ) or (
                "multi-cloud" in p.summary and "single-cloud" in new_decision.summary
            ):
                c = DBContradiction(
                    topic_id=topic.id,
                    decision_a_id=p.id,
                    decision_b_id=new_decision.id,
                    explanation=_CLOUD_CONTRADICTION["explanation"],
                    severity=_CLOUD_CONTRADICTION["severity"],
                )
                db.add(c)
                created.append(c)
    db.flush()
    return created


# ── main ──────────────────────────────────────────────────────────────────────

def main() -> None:
    engine = create_engine(DB_URL, pool_pre_ping=True)

    # ── 1. fresh schema ───────────────────────────────────────────────────────
    with engine.connect() as conn:
        conn.execute(sa_text("CREATE EXTENSION IF NOT EXISTS vector"))
        conn.commit()
    # drop_all + create_all gives us a clean slate every run
    Base.metadata.drop_all(engine)
    Base.metadata.create_all(engine)

    Session = sessionmaker(bind=engine, expire_on_commit=False)

    # ── 2. ingest all 5 fixtures ──────────────────────────────────────────────
    with (
        patch("app.ingestion.pipeline.extract_meeting",
              side_effect=lambda text, mid: EXTRACTIONS[mid]),
        patch("app.agents.topic_resolver.embed_text", side_effect=_fake_embed),
        patch("app.ingestion.pipeline.detect_contradictions",
              side_effect=_fake_detect),
    ):
        for n in range(1, 6):
            mid = f"meeting_0{n}"
            vtt_path = FIXTURES / f"{mid}.vtt"
            text = parse_vtt(vtt_path)
            db = Session()
            try:
                ingest_transcript_text(text, {"meeting_id": mid, "title": EXTRACTIONS[mid].title}, db)
            finally:
                db.close()

    # ── 3. hit the API via TestClient ─────────────────────────────────────────
    from fastapi.testclient import TestClient
    from app.db.session import get_db as _orig_get_db
    from app.main import app

    test_session = Session()

    def _override_db():
        yield test_session

    app.dependency_overrides[_orig_get_db] = _override_db
    client = TestClient(app, raise_server_exceptions=True)

    meetings   = client.get("/meetings").json()
    topics     = client.get("/topics").json()
    contradictions = client.get("/contradictions").json()

    app.dependency_overrides.clear()
    test_session.close()

    print("=== GET /meetings ===")
    print(json.dumps(meetings, indent=2, default=str))
    print("\n=== GET /topics ===")
    print(json.dumps(topics, indent=2, default=str))
    print("\n=== GET /contradictions ===")
    print(json.dumps(contradictions, indent=2, default=str))


if __name__ == "__main__":
    main()
