from __future__ import annotations

from typing import Literal
from pydantic import BaseModel, Field


class Decision(BaseModel):
    topic: str = Field(
        description="Normalized slug for grouping across meetings, e.g. 'cloud_infrastructure', for the machine, no uppercase ..."
    )
    topic_display: str = Field(
        description="Human-readable topic label, e.g. 'Cloud Infrastructure Strategy'"
    )
    summary: str = Field(
        description="One sentence: what was decided, stated as a fact"
    )
    verbatim_quote: str = Field(
        description="Exact sentence(s) from the transcript that justify this decision"
    )
    confidence: Literal["explicit", "implied", "tentative"] = Field(
        description=(
            "explicit: decision stated directly and agreed upon; "
            "implied: strongly suggested but not formally resolved; "
            "tentative: raised as a likely direction, no commitment"
        )
    )
    participants: list[str] = Field(
        default_factory=list,
        description="Names of people present when the decision was made"
    )
    decided_at: str | None = Field(
        default=None,
        description="ISO date or meeting reference if mentioned, e.g. '2024-03-15' or 'meeting_05'"
    )


class MeetingExtraction(BaseModel):
    meeting_id: str = Field(description="e.g. 'meeting_01'")
    title: str
    date: str | None = None
    decisions: list[Decision]


class Contradiction(BaseModel):
    topic: str = Field(description="Shared normalized topic slug")
    decision_a: Decision
    decision_b: Decision
    severity: Literal["minor", "major", "reversal"] = Field(
        description=(
            "minor: different emphasis or scope; "
            "major: conflicting direction; "
            "reversal: explicit flip of a prior explicit decision"
        )
    )
    summary: str = Field(description="One sentence explaining what changes and why it matters")
