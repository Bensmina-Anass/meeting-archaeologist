from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, DateTime, Enum as SAEnum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Topic(Base):
    __tablename__ = "topics"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    slug: Mapped[str] = mapped_column(String, unique=True)
    display_name: Mapped[str] = mapped_column(String)
    embedding: Mapped[list[float]] = mapped_column(Vector(768))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    decisions: Mapped[list["Decision"]] = relationship(back_populates="topic")


class Decision(Base):
    __tablename__ = "decisions"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    meeting_id: Mapped[str] = mapped_column(String)
    topic_id: Mapped[uuid.UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("topics.id"))
    summary: Mapped[str] = mapped_column(Text)
    verbatim_quote: Mapped[str] = mapped_column(Text)
    confidence: Mapped[str] = mapped_column(
        SAEnum("explicit", "implied", "tentative", name="confidence_enum")
    )
    participants: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    decided_at: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    topic: Mapped[Topic | None] = relationship(back_populates="decisions")
