from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path

import structlog

from app.ingestion.teams.models import (
    GraphParticipantInfo,
    MeetingMetadata,
    MeetingTranscript,
    OnlineMeeting,
    PersonInfo,
    TranscriptRecord,
)

log = structlog.get_logger(__name__)


def _safe_id(raw: str) -> str:
    """Replace filesystem-unsafe characters so IDs are safe as directory names."""
    return re.sub(r"[^A-Za-z0-9_-]", "_", raw)


def _person(info: GraphParticipantInfo) -> PersonInfo:
    user = info.identity.user
    if user is None:
        return PersonInfo(id="", display_name="")
    return PersonInfo(id=user.id, display_name=user.display_name or "")


class TranscriptStorage:
    def __init__(self, base_dir: Path) -> None:
        self._base = base_dir

    def meeting_dir(self, meeting_id: str) -> Path:
        return self._base / _safe_id(meeting_id)

    def vtt_path(self, meeting_id: str, transcript_id: str) -> Path:
        return self.meeting_dir(meeting_id) / f"{_safe_id(transcript_id)}.vtt"

    def metadata_path(self, meeting_id: str) -> Path:
        return self.meeting_dir(meeting_id) / "metadata.json"

    def exists(self, meeting_id: str, transcript_id: str) -> bool:
        return self.vtt_path(meeting_id, transcript_id).exists()

    def load_metadata(self, meeting_id: str) -> MeetingMetadata | None:
        path = self.metadata_path(meeting_id)
        if not path.exists():
            return None
        return MeetingMetadata.model_validate_json(path.read_text())

    def save_vtt(self, meeting_id: str, transcript_id: str, content: bytes) -> Path:
        path = self.vtt_path(meeting_id, transcript_id)
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        log.info("vtt_written", path=str(path), bytes=len(content))
        return path

    def upsert_metadata(
        self,
        meeting: OnlineMeeting,
        transcript: MeetingTranscript,
        vtt_path: Path,
    ) -> None:
        meta_path = self.metadata_path(meeting.id)
        meta_path.parent.mkdir(parents=True, exist_ok=True)

        if meta_path.exists():
            meta = MeetingMetadata.model_validate_json(meta_path.read_text())
            if any(t.transcript_id == transcript.id for t in meta.transcripts):
                log.info("metadata_already_recorded", transcript_id=transcript.id)
                return
        else:
            meta = MeetingMetadata(
                meeting_id=meeting.id,
                subject=meeting.subject or "(no subject)",
                organizer=_person(meeting.participants.organizer),
                start_time=meeting.start_datetime,
                end_time=meeting.end_datetime,
                participants=[_person(p) for p in meeting.participants.attendees],
                transcripts=[],
            )

        meta.transcripts.append(
            TranscriptRecord(
                transcript_id=transcript.id,
                created_date_time=transcript.created_date_time,
                file_path=str(vtt_path),
                fetched_at=datetime.now(timezone.utc).isoformat(),
            )
        )
        meta_path.write_text(meta.model_dump_json(indent=2))
        log.info("metadata_written", path=str(meta_path))
