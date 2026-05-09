from __future__ import annotations

import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import ARRAY, Boolean, DateTime, Enum as SAEnum, ForeignKey, String, Text
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
    contradictions: Mapped[list["Contradiction"]] = relationship(back_populates="topic")


class Meeting(Base):
    __tablename__ = "meetings"

    # String PK — matches decisions.meeting_id (no FK to keep migration simple)
    id: Mapped[str] = mapped_column(String, primary_key=True)
    title: Mapped[str] = mapped_column(String)
    source: Mapped[str] = mapped_column(String, default="manual")
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    attendees: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )


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
    contradictions_as_a: Mapped[list["Contradiction"]] = relationship(
        foreign_keys="Contradiction.decision_a_id", back_populates="decision_a"
    )
    contradictions_as_b: Mapped[list["Contradiction"]] = relationship(
        foreign_keys="Contradiction.decision_b_id", back_populates="decision_b"
    )


class Contradiction(Base):
    __tablename__ = "contradictions"

    id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    topic_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("topics.id"))
    decision_a_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("decisions.id"))
    decision_b_id: Mapped[uuid.UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("decisions.id"))
    explanation: Mapped[str] = mapped_column(Text)
    # severity uses low/medium/high for gradual signalling; the Pydantic
    # Contradiction model uses minor/major/reversal — the detector maps between them.
    severity: Mapped[str] = mapped_column(
        SAEnum("low", "medium", "high", name="contradiction_severity_enum")
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    dismissed: Mapped[bool] = mapped_column(Boolean, default=False)

    topic: Mapped[Topic] = relationship(back_populates="contradictions")
    decision_a: Mapped[Decision] = relationship(
        foreign_keys=[decision_a_id], back_populates="contradictions_as_a"
    )
    decision_b: Mapped[Decision] = relationship(
        foreign_keys=[decision_b_id], back_populates="contradictions_as_b"
    )
