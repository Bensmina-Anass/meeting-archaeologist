from __future__ import annotations

from datetime import datetime, timezone

import structlog
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.contradiction_detector import detect_contradictions
from app.agents.embedder import embed_text
from app.agents.extractor import extract_meeting
from app.agents.topic_resolver import resolve_topic
from app.db.models import Decision as DBDecision, Meeting, Topic
from app.models import MeetingExtraction

log = structlog.get_logger(__name__)


def ingest_transcript_text(
    text: str,
    meeting_metadata: dict,
    db: Session,
) -> MeetingExtraction:
    """Extract decisions from *text*, persist them, and run contradiction detection.

    meeting_metadata keys:
        meeting_id  (str, required)
        title       (str, default: meeting_id)
        source      (str, default: "manual")
        started_at  (datetime | str | None)
        ended_at    (datetime | str | None)
        attendees   (list[str], default: [])

    Commits at the end of a successful run. Caller is responsible for rollback on
    exception (or pass a session that handles it via context manager).
    """
    meeting_id: str = meeting_metadata["meeting_id"]

    # Upsert meeting row — idempotent: re-running doesn't create duplicates
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        meeting = Meeting(
            id=meeting_id,
            title=meeting_metadata.get("title") or meeting_id,
            source=meeting_metadata.get("source", "manual"),
            started_at=_parse_dt(meeting_metadata.get("started_at")),
            ended_at=_parse_dt(meeting_metadata.get("ended_at")),
            attendees=meeting_metadata.get("attendees") or [],
            transcript=text,
            ingested_at=datetime.now(timezone.utc),
        )
        db.add(meeting)
    else:
        meeting.title = meeting_metadata.get("title") or meeting_id
        meeting.started_at = _parse_dt(meeting_metadata.get("started_at"))
        meeting.ended_at = _parse_dt(meeting_metadata.get("ended_at"))
        meeting.attendees = meeting_metadata.get("attendees") or []
        meeting.transcript = text
    db.flush()

    log.info("ingesting_meeting", meeting_id=meeting_id)

    existing_topics = _get_existing_topics(db, text)
    extraction: MeetingExtraction = extract_meeting(text, meeting_id, existing_topics)

    for pydantic_decision in extraction.decisions:
        topic = resolve_topic(db, pydantic_decision)

        db_decision = DBDecision(
            meeting_id=meeting_id,
            topic_id=topic.id,
            summary=pydantic_decision.summary,
            verbatim_quote=pydantic_decision.verbatim_quote,
            confidence=pydantic_decision.confidence,
            participants=pydantic_decision.participants,
            decided_at=pydantic_decision.decided_at,
        )
        db.add(db_decision)
        db.flush()  # flush so contradiction detector can see the new row's id

        detect_contradictions(db_decision, topic, db)

    db.commit()
    log.info(
        "ingestion_complete",
        meeting_id=meeting_id,
        decisions=len(extraction.decisions),
    )
    return extraction


_TOPIC_HINT_LIMIT = 30
_TOPIC_HINT_TOP_K = 15


def _get_existing_topics(db: Session, transcript_text: str) -> list[tuple[str, str]]:
    """Return (slug, display_name) pairs to hint the extractor toward reusing slugs."""
    all_topics = db.scalars(select(Topic)).all()
    if not all_topics:
        return []
    if len(all_topics) < _TOPIC_HINT_LIMIT:
        return [(t.slug, t.display_name) for t in all_topics]
    # Too many topics — embed the first 4 k chars of the transcript and pick nearest 15.
    tx_embedding = embed_text(transcript_text[:4000])
    rows = db.execute(
        select(Topic, Topic.embedding.cosine_distance(tx_embedding).label("dist"))
        .order_by("dist")
        .limit(_TOPIC_HINT_TOP_K)
    ).all()
    return [(r.Topic.slug, r.Topic.display_name) for r in rows]


def _parse_dt(value: datetime | str | None) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(value).astimezone(timezone.utc)
    except (ValueError, TypeError):
        return None
