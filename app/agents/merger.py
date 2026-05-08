from __future__ import annotations

import numpy as np
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.config import TOPIC_SIMILARITY_THRESHOLD
from app.db.models import Decision, Topic


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    va = np.array(a, dtype=np.float32)
    vb = np.array(b, dtype=np.float32)
    return float(np.dot(va, vb) / (np.linalg.norm(va) * np.linalg.norm(vb)))


def run_merge_pass(session: Session, threshold: float | None = None) -> int:
    """
    Scan all topic pairs. Where cosine similarity >= threshold, merge the
    newer topic into the older one (redirect its decisions, then delete it).
    Returns the number of merges performed. Flushes but does not commit.
    """
    if threshold is None:
        threshold = TOPIC_SIMILARITY_THRESHOLD

    topics = session.execute(
        select(Topic).order_by(Topic.created_at)
    ).scalars().all()

    deleted_ids: set[str] = set()
    merges = 0

    for i, anchor in enumerate(topics):
        if str(anchor.id) in deleted_ids:
            continue

        for candidate in topics[i + 1:]:
            if str(candidate.id) in deleted_ids:
                continue

            if _cosine_similarity(anchor.embedding, candidate.embedding) >= threshold:
                session.execute(
                    update(Decision)
                    .where(Decision.topic_id == candidate.id)
                    .values(topic_id=anchor.id)
                )
                deleted_ids.add(str(candidate.id))
                merges += 1

    for topic in topics:
        if str(topic.id) in deleted_ids:
            session.delete(topic)

    session.flush()
    return merges
