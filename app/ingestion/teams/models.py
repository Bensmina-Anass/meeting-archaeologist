from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


# ── Graph API response shapes (camelCase → snake_case via aliases) ─────────────

class GraphIdentity(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    display_name: str | None = Field(None, alias="displayName")


class GraphIdentitySet(BaseModel):
    user: GraphIdentity | None = None


class GraphParticipantInfo(BaseModel):
    identity: GraphIdentitySet
    upn: str | None = None


class GraphParticipants(BaseModel):
    organizer: GraphParticipantInfo
    attendees: list[GraphParticipantInfo] = []


class OnlineMeeting(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    subject: str | None = None
    start_datetime: str = Field(alias="startDateTime")
    end_datetime: str = Field(alias="endDateTime")
    participants: GraphParticipants


class MeetingTranscript(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    id: str
    created_date_time: str = Field(alias="createdDateTime")


# ── Domain / storage models ────────────────────────────────────────────────────

class PersonInfo(BaseModel):
    id: str
    display_name: str


class TranscriptRecord(BaseModel):
    transcript_id: str
    created_date_time: str
    file_path: str
    fetched_at: str


class MeetingMetadata(BaseModel):
    source: str = "teams"
    meeting_id: str
    subject: str
    organizer: PersonInfo
    start_time: str
    end_time: str
    participants: list[PersonInfo]
    transcripts: list[TranscriptRecord]


class IngestStats(BaseModel):
    meetings_found: int = 0
    transcripts_found: int = 0
    # VTT fetch counts
    fetched: int = 0
    skipped: int = 0
    # Extraction counts (after VTT fetch)
    extracted: int = 0
    extraction_skipped: int = 0
    errors: list[str] = []

    # keep old field as alias so existing callers that read .written still work
    @property
    def written(self) -> int:
        return self.fetched
