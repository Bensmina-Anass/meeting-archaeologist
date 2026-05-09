from __future__ import annotations

from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import Contradiction, Decision, Meeting, Topic
from app.models.api import (
    CalendarContradiction,
    CalendarDecision,
    CalendarMeeting,
    CalendarMeetingDetail,
)

router = APIRouter(prefix="/calendar", tags=["calendar"])


def _date_to_dt(d: str, end: bool = False) -> datetime:
    """Parse YYYY-MM-DD into a UTC-aware datetime (start or end of day)."""
    parsed = date.fromisoformat(d)
    if end:
        return datetime(parsed.year, parsed.month, parsed.day, 23, 59, 59, tzinfo=timezone.utc)
    return datetime(parsed.year, parsed.month, parsed.day, 0, 0, 0, tzinfo=timezone.utc)


def _meeting_to_calendar(
    meeting: Meeting,
    decision_count: int,
    topic_slugs: list[str],
    has_contradiction: bool,
    contradicts_meeting_ids: list[str],
) -> CalendarMeeting:
    dt = meeting.started_at or meeting.ingested_at
    date_str = dt.astimezone(timezone.utc).strftime("%Y-%m-%d")
    return CalendarMeeting(
        id=meeting.id,
        date=date_str,
        title=meeting.title,
        attendees=meeting.attendees,
        topics=topic_slugs,
        decision_count=decision_count,
        has_contradiction=has_contradiction,
        contradicts_meeting_ids=contradicts_meeting_ids,
    )


@router.get("/meetings", response_model=list[CalendarMeeting])
def list_calendar_meetings(
    from_date: str = Query(..., alias="from", description="YYYY-MM-DD"),
    to_date: str = Query(..., alias="to", description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
) -> list[CalendarMeeting]:
    try:
        dt_from = _date_to_dt(from_date)
        dt_to = _date_to_dt(to_date, end=True)
    except ValueError:
        raise HTTPException(status_code=422, detail="from/to must be YYYY-MM-DD")

    meetings = db.scalars(
        select(Meeting)
        .where(
            func.coalesce(Meeting.started_at, Meeting.ingested_at) >= dt_from,
            func.coalesce(Meeting.started_at, Meeting.ingested_at) <= dt_to,
        )
        .order_by(func.coalesce(Meeting.started_at, Meeting.ingested_at))
    ).all()

    if not meetings:
        return []

    meeting_ids = [m.id for m in meetings]

    # Decisions: count + topic slugs per meeting
    decision_rows = db.execute(
        select(Decision.meeting_id, func.count(Decision.id).label("cnt"), Topic.slug)
        .join(Topic, Decision.topic_id == Topic.id, isouter=True)
        .where(Decision.meeting_id.in_(meeting_ids))
        .group_by(Decision.meeting_id, Topic.slug)
    ).all()

    decision_counts: dict[str, int] = {}
    topic_slug_map: dict[str, list[str]] = {}
    for meeting_id, cnt, slug in decision_rows:
        decision_counts[meeting_id] = decision_counts.get(meeting_id, 0) + cnt
        if slug:
            topic_slug_map.setdefault(meeting_id, [])
            if slug not in topic_slug_map[meeting_id]:
                topic_slug_map[meeting_id].append(slug)

    # Contradictions: which meetings contradict which
    contradiction_rows = db.execute(
        select(Decision.meeting_id, Contradiction.decision_a_id, Contradiction.decision_b_id)
        .join(Decision, Contradiction.decision_a_id == Decision.id)
        .where(Contradiction.dismissed.is_(False))
    ).all()

    # Also get meeting_id for decision_b
    b_ids = [r.decision_b_id for r in contradiction_rows]
    b_meeting_map: dict = {}
    if b_ids:
        b_rows = db.execute(
            select(Decision.id, Decision.meeting_id).where(Decision.id.in_(b_ids))
        ).all()
        b_meeting_map = {row.id: row.meeting_id for row in b_rows}

    # Build per-meeting contradiction sets (only for meetings in our date range)
    mid_set = set(meeting_ids)
    contradicts: dict[str, set[str]] = {mid: set() for mid in meeting_ids}
    for row in contradiction_rows:
        a_mid = row.meeting_id
        b_mid = b_meeting_map.get(row.decision_b_id)
        if a_mid in mid_set and b_mid and b_mid != a_mid:
            contradicts[a_mid].add(b_mid)
        if b_mid in mid_set and a_mid and a_mid != b_mid:
            contradicts.setdefault(b_mid, set()).add(a_mid)

    return [
        _meeting_to_calendar(
            m,
            decision_counts.get(m.id, 0),
            topic_slug_map.get(m.id, []),
            bool(contradicts.get(m.id)),
            list(contradicts.get(m.id, set())),
        )
        for m in meetings
    ]


@router.get("/meetings/{meeting_id}", response_model=CalendarMeetingDetail)
def get_calendar_meeting(meeting_id: str, db: Session = Depends(get_db)) -> CalendarMeetingDetail:
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    # Decisions with topic slugs
    decision_rows = db.execute(
        select(Decision, Topic.slug)
        .join(Topic, Decision.topic_id == Topic.id, isouter=True)
        .where(Decision.meeting_id == meeting_id)
        .order_by(Decision.created_at)
    ).all()

    topic_slugs: list[str] = []
    seen_slugs: set[str] = set()
    calendar_decisions: list[CalendarDecision] = []
    for dec, slug in decision_rows:
        effective_slug = slug or "uncategorized"
        if effective_slug not in seen_slugs:
            seen_slugs.add(effective_slug)
            topic_slugs.append(effective_slug)
        calendar_decisions.append(CalendarDecision(
            topic=effective_slug,
            decision=dec.summary,
            owner=dec.participants[0] if dec.participants else None,
            rationale=dec.verbatim_quote or None,
        ))

    decision_ids = [dec.id for dec, _ in decision_rows]

    # Contradictions involving this meeting's decisions
    contradictions: list[CalendarContradiction] = []
    contradicts_meeting_ids: set[str] = set()

    if decision_ids:
        contra_rows = db.execute(
            select(Contradiction, Decision.summary.label("a_summary"), Decision.meeting_id.label("a_mid"))
            .join(Decision, Contradiction.decision_a_id == Decision.id)
            .where(
                Contradiction.dismissed.is_(False),
                (Contradiction.decision_a_id.in_(decision_ids) | Contradiction.decision_b_id.in_(decision_ids)),
            )
        ).all()

        for contra, a_summary, a_mid in contra_rows:
            # Determine which side is "this meeting" and which is the other
            if contra.decision_a_id in {d.id for d, _ in decision_rows}:
                this_summary = a_summary
                other_dec = db.get(Decision, contra.decision_b_id)
            else:
                other_dec = db.get(Decision, contra.decision_a_id)
                this_dec = db.get(Decision, contra.decision_b_id)
                this_summary = this_dec.summary if this_dec else ""

            if not other_dec:
                continue

            other_meeting = db.get(Meeting, other_dec.meeting_id)
            if not other_meeting:
                continue

            other_dt = other_meeting.started_at or other_meeting.ingested_at
            other_date = other_dt.astimezone(timezone.utc).strftime("%Y-%m-%d")
            contradicts_meeting_ids.add(other_meeting.id)

            contradictions.append(CalendarContradiction(
                decision=this_summary,
                conflicting_decision=other_dec.summary,
                conflicting_meeting_id=other_meeting.id,
                conflicting_meeting_date=other_date,
                conflicting_meeting_title=other_meeting.title,
            ))

    dt = meeting.started_at or meeting.ingested_at
    date_str = dt.astimezone(timezone.utc).strftime("%Y-%m-%d")

    return CalendarMeetingDetail(
        id=meeting.id,
        date=date_str,
        title=meeting.title,
        attendees=meeting.attendees,
        topics=topic_slugs,
        decision_count=len(calendar_decisions),
        has_contradiction=bool(contradictions),
        contradicts_meeting_ids=list(contradicts_meeting_ids),
        decisions=calendar_decisions,
        contradictions=contradictions,
        transcript=meeting.transcript or "",
    )
