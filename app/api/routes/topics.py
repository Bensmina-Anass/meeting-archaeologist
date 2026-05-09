from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import Decision, Topic
from app.models.api import DecisionOut, TopicDetail, TopicSummary

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("", response_model=list[TopicSummary])
def list_topics(db: Session = Depends(get_db)) -> list[TopicSummary]:
    rows = db.execute(
        select(Topic, func.count(Decision.id).label("decision_count"))
        .outerjoin(Decision, Decision.topic_id == Topic.id)
        .group_by(Topic.id)
        .order_by(Topic.created_at)
    ).all()
    return [
        TopicSummary(
            id=topic.id,
            slug=topic.slug,
            display_name=topic.display_name,
            decision_count=count,
            created_at=topic.created_at,
        )
        for topic, count in rows
    ]


@router.get("/{topic_id}", response_model=TopicDetail)
def get_topic(topic_id: uuid.UUID, db: Session = Depends(get_db)) -> TopicDetail:
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    decisions = list(
        db.execute(
            select(Decision)
            .where(Decision.topic_id == topic_id)
            .order_by(Decision.created_at)
        ).scalars()
    )
    return TopicDetail(
        id=topic.id,
        slug=topic.slug,
        display_name=topic.display_name,
        created_at=topic.created_at,
        decisions=[DecisionOut.model_validate(d) for d in decisions],
    )


@router.get("/{topic_id}/decisions", response_model=list[DecisionOut])
def list_topic_decisions(
    topic_id: uuid.UUID, db: Session = Depends(get_db)
) -> list[DecisionOut]:
    topic = db.get(Topic, topic_id)
    if topic is None:
        raise HTTPException(status_code=404, detail="Topic not found")
    decisions = list(
        db.execute(
            select(Decision)
            .where(Decision.topic_id == topic_id)
            .order_by(Decision.created_at)
        ).scalars()
    )
    return [DecisionOut.model_validate(d) for d in decisions]
