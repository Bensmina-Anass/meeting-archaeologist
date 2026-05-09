from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone
from typing import Any

import structlog

from app.ingestion.teams.client import GraphClient
from app.ingestion.teams.config import Settings
from app.ingestion.teams.models import IngestStats, MeetingTranscript, OnlineMeeting
from app.ingestion.teams.storage import TranscriptStorage

log = structlog.get_logger(__name__)


# ── Time-window parsing (shared by cli and API route) ─────────────────────────

def parse_window(value: str) -> datetime:
    """Parse '7d', '24h', '30m' or an ISO-8601 string into a UTC datetime."""
    m = re.fullmatch(r"(\d+)(d|h|m)", value)
    if m:
        n = int(m.group(1))
        delta = {"d": timedelta(days=n), "h": timedelta(hours=n), "m": timedelta(minutes=n)}[
            m.group(2)
        ]
        return datetime.now(timezone.utc) - delta
    return datetime.fromisoformat(value).astimezone(timezone.utc)


# ── Graph API helpers ─────────────────────────────────────────────────────────

def _fmt_dt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


async def list_meetings(
    client: GraphClient,
    user_id: str,
    since: datetime,
    until: datetime,
) -> list[OnlineMeeting]:
    filter_expr = (
        f"startDateTime ge {_fmt_dt(since)} and startDateTime le {_fmt_dt(until)}"
    )
    meetings: list[OnlineMeeting] = []
    path: str | None = f"/users/{user_id}/onlineMeetings"
    params: dict[str, str] = {"$filter": filter_expr}

    while path is not None:
        page: dict[str, Any] = await client.get(path, **params)
        for item in page.get("value", []):
            meetings.append(OnlineMeeting.model_validate(item))
        next_link: str | None = page.get("@odata.nextLink")
        path = next_link
        params = {}

    log.info("meetings_listed", since=_fmt_dt(since), until=_fmt_dt(until), count=len(meetings))
    return meetings


async def list_transcripts(
    client: GraphClient,
    user_id: str,
    meeting_id: str,
) -> list[MeetingTranscript]:
    path = f"/users/{user_id}/onlineMeetings/{meeting_id}/transcripts"
    try:
        data: dict[str, Any] = await client.get(path)
    except Exception as exc:
        log.warning("transcripts_unavailable", meeting_id=meeting_id, error=str(exc))
        return []

    transcripts = [MeetingTranscript.model_validate(t) for t in data.get("value", [])]
    log.info("transcripts_listed", meeting_id=meeting_id, count=len(transcripts))
    return transcripts


async def fetch_vtt(
    client: GraphClient,
    user_id: str,
    meeting_id: str,
    transcript_id: str,
) -> bytes:
    path = (
        f"/users/{user_id}/onlineMeetings/{meeting_id}"
        f"/transcripts/{transcript_id}/content"
    )
    return await client.get_bytes(path, **{"$format": "text/vtt"})


# ── Top-level orchestrator ────────────────────────────────────────────────────

async def run_ingestion(
    settings: Settings,
    since: datetime,
    until: datetime | None = None,
    force: bool = False,
) -> IngestStats:
    # Import here to avoid circular imports at module load time; pipeline imports
    # DB models which pull in config — safe after .env is loaded.
    from app.db import SessionLocal, get_db
    from app.db.models import Meeting
    from app.ingestion.pipeline import ingest_transcript_text
    from app.ingestion.vtt import parse_vtt

    until = until or datetime.now(timezone.utc)
    storage = TranscriptStorage(settings.ingestion_base_dir)
    stats = IngestStats()

    async with GraphClient(settings) as client:
        meetings = await list_meetings(
            client, settings.teams_target_user_id, since, until
        )
        stats.meetings_found = len(meetings)

        for meeting in meetings:
            transcripts = await list_transcripts(
                client, settings.teams_target_user_id, meeting.id
            )
            stats.transcripts_found += len(transcripts)

            for transcript in transcripts:
                # ── Step 1: fetch and save raw VTT ───────────────────────────
                if storage.exists(meeting.id, transcript.id):
                    log.info(
                        "skipping_existing_vtt",
                        meeting_id=meeting.id,
                        transcript_id=transcript.id,
                    )
                    stats.skipped += 1
                else:
                    content = await fetch_vtt(
                        client, settings.teams_target_user_id, meeting.id, transcript.id
                    )
                    vtt_path = storage.save_vtt(meeting.id, transcript.id, content)
                    storage.upsert_metadata(meeting, transcript, vtt_path)
                    stats.fetched += 1

                # ── Step 2: extract decisions from VTT ────────────────────────
                vtt_path = storage.vtt_path(meeting.id, transcript.id)
                if not vtt_path.exists():
                    continue

                # Check idempotency: skip if already extracted unless force
                db = SessionLocal()
                try:
                    already_extracted = db.get(Meeting, meeting.id) is not None
                finally:
                    db.close()

                if already_extracted and not force:
                    log.info("skipping_extraction", meeting_id=meeting.id)
                    stats.extraction_skipped += 1
                    continue

                try:
                    text = parse_vtt(vtt_path)
                    meta = storage.load_metadata(meeting.id)
                    meeting_metadata = _build_metadata(meeting.id, meta)

                    db = SessionLocal()
                    try:
                        ingest_transcript_text(text, meeting_metadata, db)
                    finally:
                        db.close()

                    stats.extracted += 1
                    log.info("extraction_complete", meeting_id=meeting.id)
                except Exception as exc:
                    err = f"{meeting.id}: {exc}"
                    log.error("extraction_error", meeting_id=meeting.id, error=str(exc))
                    stats.errors.append(err)

    log.info("ingestion_complete", **stats.model_dump())
    return stats


def _build_metadata(meeting_id: str, meta: Any | None) -> dict:
    """Convert Teams MeetingMetadata (or None) to the pipeline's meeting_metadata dict."""
    if meta is None:
        return {"meeting_id": meeting_id, "source": "teams"}

    attendee_names = [p.display_name for p in meta.participants]
    return {
        "meeting_id": meeting_id,
        "title": meta.subject,
        "source": "teams",
        "started_at": meta.start_time,
        "ended_at": meta.end_time,
        "attendees": attendee_names,
    }
