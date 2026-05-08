from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.agents.embedder import embed_text
from app.core.config import TOPIC_SIMILARITY_THRESHOLD
from app.db.models import Topic
from app.models import Decision as PydanticDecision

# cosine_distance returns values in [0, 2]; threshold converts to distance space
_DISTANCE_THRESHOLD = 1.0 - TOPIC_SIMILARITY_THRESHOLD


def resolve_topic(session: Session, decision: PydanticDecision) -> Topic:
    """
    Return the canonical Topic for a decision, creating one if no existing
    topic is similar enough. Flushes but does not commit.
    """
    anchor = f"{decision.topic}: {decision.summary}"
    embedding = embed_text(anchor)

    row = session.execute(
        select(Topic, Topic.embedding.cosine_distance(embedding).label("dist"))
        .order_by("dist")
        .limit(1)
    ).first()

    if row is not None and row.dist <= _DISTANCE_THRESHOLD:
        return row.Topic

    topic = Topic(
        slug=decision.topic,
        display_name=decision.topic_display,
        embedding=embedding,
    )
    session.add(topic)
    session.flush()
    return topic
