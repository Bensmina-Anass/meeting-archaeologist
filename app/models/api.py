from __future__ import annotations

import uuid
from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


# ── Decisions ─────────────────────────────────────────────────────────────────

class DecisionOut(BaseModel):
    id: uuid.UUID
    meeting_id: str
    topic_id: uuid.UUID | None
    summary: str
    verbatim_quote: str
    confidence: str
    participants: list[str]
    decided_at: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Topics ────────────────────────────────────────────────────────────────────

class TopicSummary(BaseModel):
    id: uuid.UUID
    slug: str
    display_name: str
    decision_count: int
    created_at: datetime

    model_config = {"from_attributes": True}


class TopicDetail(BaseModel):
    id: uuid.UUID
    slug: str
    display_name: str
    created_at: datetime
    decisions: list[DecisionOut]

    model_config = {"from_attributes": True}


# ── Meetings ──────────────────────────────────────────────────────────────────

class MeetingSummary(BaseModel):
    id: str
    title: str
    source: str
    started_at: datetime | None
    ended_at: datetime | None
    attendees: list[str]
    decision_count: int
    ingested_at: datetime

    model_config = {"from_attributes": True}


class MeetingDetail(BaseModel):
    id: str
    title: str
    source: str
    started_at: datetime | None
    ended_at: datetime | None
    attendees: list[str]
    ingested_at: datetime
    decisions: list[DecisionOut]

    model_config = {"from_attributes": True}


# ── Calendar ──────────────────────────────────────────────────────────────────

class CalendarMeeting(BaseModel):
    id: str
    date: str  # YYYY-MM-DD
    title: str
    attendees: list[str]
    topics: list[str]
    decision_count: int
    has_contradiction: bool
    contradicts_meeting_ids: list[str]


class CalendarDecision(BaseModel):
    topic: str
    decision: str
    owner: str | None
    rationale: str | None


class CalendarContradiction(BaseModel):
    decision: str
    conflicting_decision: str
    conflicting_meeting_id: str
    conflicting_meeting_date: str
    conflicting_meeting_title: str


class CalendarMeetingDetail(CalendarMeeting):
    decisions: list[CalendarDecision]
    contradictions: list[CalendarContradiction]
    transcript: str


# ── Contradictions ────────────────────────────────────────────────────────────

class ContradictionOut(BaseModel):
    id: uuid.UUID
    topic_id: uuid.UUID
    decision_a_id: uuid.UUID
    decision_b_id: uuid.UUID
    explanation: str
    severity: str
    detected_at: datetime
    dismissed: bool

    model_config = {"from_attributes": True}
