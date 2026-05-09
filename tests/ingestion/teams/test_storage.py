from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.ingestion.teams.models import (
    GraphIdentity,
    GraphIdentitySet,
    GraphParticipantInfo,
    GraphParticipants,
    MeetingTranscript,
    OnlineMeeting,
)
from app.ingestion.teams.storage import TranscriptStorage


def _meeting(mid: str = "meeting-1") -> OnlineMeeting:
    organizer = GraphParticipantInfo(
        identity=GraphIdentitySet(
            user=GraphIdentity(id="user-1", **{"displayName": "Alice"})
        )
    )
    return OnlineMeeting.model_validate(
        {
            "id": mid,
            "subject": "Weekly Sync",
            "startDateTime": "2025-01-01T10:00:00Z",
            "endDateTime": "2025-01-01T11:00:00Z",
            "participants": {
                "organizer": organizer.model_dump(),
                "attendees": [],
            },
        }
    )


def _transcript(tid: str = "transcript-1") -> MeetingTranscript:
    return MeetingTranscript.model_validate(
        {"id": tid, "createdDateTime": "2025-01-01T10:05:00Z"}
    )


class TestIdempotency:
    def test_exists_false_when_no_file(self, tmp_path: Path) -> None:
        storage = TranscriptStorage(tmp_path)
        assert not storage.exists("meeting-1", "transcript-1")

    def test_exists_true_after_save(self, tmp_path: Path) -> None:
        storage = TranscriptStorage(tmp_path)
        storage.save_vtt("meeting-1", "transcript-1", b"WEBVTT\n")
        assert storage.exists("meeting-1", "transcript-1")

    def test_save_vtt_twice_overwrites_silently(self, tmp_path: Path) -> None:
        storage = TranscriptStorage(tmp_path)
        storage.save_vtt("meeting-1", "transcript-1", b"first")
        storage.save_vtt("meeting-1", "transcript-1", b"second")
        assert storage.vtt_path("meeting-1", "transcript-1").read_bytes() == b"second"


class TestMetadataShape:
    def test_metadata_written_correctly(self, tmp_path: Path) -> None:
        storage = TranscriptStorage(tmp_path)
        meeting = _meeting()
        transcript = _transcript()
        vtt_path = storage.save_vtt(meeting.id, transcript.id, b"WEBVTT\n")
        storage.upsert_metadata(meeting, transcript, vtt_path)

        raw = json.loads(storage.metadata_path(meeting.id).read_text())
        assert raw["source"] == "teams"
        assert raw["meeting_id"] == "meeting-1"
        assert raw["subject"] == "Weekly Sync"
        assert raw["organizer"]["id"] == "user-1"
        assert raw["organizer"]["display_name"] == "Alice"
        assert len(raw["transcripts"]) == 1
        assert raw["transcripts"][0]["transcript_id"] == "transcript-1"
        assert "fetched_at" in raw["transcripts"][0]

    def test_metadata_file_path_recorded(self, tmp_path: Path) -> None:
        storage = TranscriptStorage(tmp_path)
        meeting = _meeting()
        transcript = _transcript()
        vtt_path = storage.save_vtt(meeting.id, transcript.id, b"WEBVTT\n")
        storage.upsert_metadata(meeting, transcript, vtt_path)

        raw = json.loads(storage.metadata_path(meeting.id).read_text())
        assert raw["transcripts"][0]["file_path"] == str(vtt_path)


class TestMetadataAppend:
    def test_second_transcript_appended(self, tmp_path: Path) -> None:
        storage = TranscriptStorage(tmp_path)
        meeting = _meeting()

        t1 = _transcript("transcript-1")
        t2 = _transcript("transcript-2")

        vtt1 = storage.save_vtt(meeting.id, t1.id, b"WEBVTT\n1")
        storage.upsert_metadata(meeting, t1, vtt1)

        vtt2 = storage.save_vtt(meeting.id, t2.id, b"WEBVTT\n2")
        storage.upsert_metadata(meeting, t2, vtt2)

        raw = json.loads(storage.metadata_path(meeting.id).read_text())
        ids = [t["transcript_id"] for t in raw["transcripts"]]
        assert ids == ["transcript-1", "transcript-2"]

    def test_duplicate_transcript_not_appended(self, tmp_path: Path) -> None:
        storage = TranscriptStorage(tmp_path)
        meeting = _meeting()
        transcript = _transcript()

        vtt_path = storage.save_vtt(meeting.id, transcript.id, b"WEBVTT\n")
        storage.upsert_metadata(meeting, transcript, vtt_path)
        storage.upsert_metadata(meeting, transcript, vtt_path)  # second call

        raw = json.loads(storage.metadata_path(meeting.id).read_text())
        assert len(raw["transcripts"]) == 1

    def test_safe_id_replaces_special_chars(self, tmp_path: Path) -> None:
        storage = TranscriptStorage(tmp_path)
        meeting_id = "MSp/abc+123=="
        vtt_path = storage.save_vtt(meeting_id, "t-1", b"WEBVTT\n")
        assert vtt_path.exists()
        assert "/" not in str(vtt_path.parent.name)
        assert "+" not in str(vtt_path.parent.name)
