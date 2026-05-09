from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import Contradiction
from app.models.api import ContradictionOut

router = APIRouter(prefix="/contradictions", tags=["contradictions"])


@router.get("", response_model=list[ContradictionOut])
def list_contradictions(
    dismissed: bool = Query(False, description="Include dismissed contradictions"),
    topic_id: uuid.UUID | None = Query(None),
    db: Session = Depends(get_db),
) -> list[ContradictionOut]:
    q = select(Contradiction).order_by(Contradiction.detected_at.desc())
    if not dismissed:
        q = q.where(Contradiction.dismissed.is_(False))
    if topic_id is not None:
        q = q.where(Contradiction.topic_id == topic_id)
    rows = list(db.execute(q).scalars())
    return [ContradictionOut.model_validate(r) for r in rows]


@router.post("/{contradiction_id}/dismiss", response_model=ContradictionOut)
def dismiss_contradiction(
    contradiction_id: uuid.UUID, db: Session = Depends(get_db)
) -> ContradictionOut:
    c = db.get(Contradiction, contradiction_id)
    if c is None:
        raise HTTPException(status_code=404, detail="Contradiction not found")
    c.dismissed = True
    db.commit()
    db.refresh(c)
    return ContradictionOut.model_validate(c)
