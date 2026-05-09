from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import Decision, Meeting
from app.models.api import DecisionOut, MeetingDetail, MeetingSummary, Page

router = APIRouter(prefix="/meetings", tags=["meetings"])


@router.get("", response_model=Page[MeetingSummary])
def list_meetings(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
) -> Page[MeetingSummary]:
    total: int = db.execute(
        select(func.count()).select_from(Meeting)
    ).scalar_one()

    rows = db.execute(
        select(Meeting, func.count(Decision.id).label("decision_count"))
        .outerjoin(Decision, Decision.meeting_id == Meeting.id)
        .group_by(Meeting.id)
        .order_by(Meeting.ingested_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    items = [
        MeetingSummary(
            id=m.id,
            title=m.title,
            source=m.source,
            started_at=m.started_at,
            ended_at=m.ended_at,
            attendees=m.attendees,
            decision_count=count,
            ingested_at=m.ingested_at,
        )
        for m, count in rows
    ]
    return Page(items=items, total=total, page=page, page_size=page_size)


@router.get("/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)) -> MeetingDetail:
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")
    decisions = list(
        db.execute(
            select(Decision)
            .where(Decision.meeting_id == meeting_id)
            .order_by(Decision.created_at)
        ).scalars()
    )
    return MeetingDetail(
        id=meeting.id,
        title=meeting.title,
        source=meeting.source,
        started_at=meeting.started_at,
        ended_at=meeting.ended_at,
        attendees=meeting.attendees,
        ingested_at=meeting.ingested_at,
        decisions=[DecisionOut.model_validate(d) for d in decisions],
    )
