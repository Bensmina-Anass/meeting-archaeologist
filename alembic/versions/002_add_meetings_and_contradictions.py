"""add meetings and contradictions tables

Revision ID: 002
Revises: 001
Create Date: 2026-05-08
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import ENUM as PgEnum

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # meetings — keyed by the same string ID used in decisions.meeting_id.
    # Deliberately no FK from decisions → meetings so the existing 001 data
    # (which has no matching meeting rows) keeps working.
    op.create_table(
        "meetings",
        sa.Column("id", sa.String(), primary_key=True, nullable=False),
        sa.Column("title", sa.String(), nullable=False),
        sa.Column("source", sa.String(), nullable=False, server_default="manual"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("attendees", postgresql.ARRAY(sa.String()), nullable=False, server_default="{}"),
        sa.Column("ingested_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE contradiction_severity_enum AS ENUM ('low', 'medium', 'high');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.create_table(
        "contradictions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "topic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("topics.id", name="fk_contradictions_topic_id"),
            nullable=False,
        ),
        sa.Column(
            "decision_a_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("decisions.id", name="fk_contradictions_decision_a_id"),
            nullable=False,
        ),
        sa.Column(
            "decision_b_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("decisions.id", name="fk_contradictions_decision_b_id"),
            nullable=False,
        ),
        sa.Column("explanation", sa.Text(), nullable=False),
        sa.Column(
            "severity",
            PgEnum("low", "medium", "high", name="contradiction_severity_enum", create_type=False),
            nullable=False,
        ),
        sa.Column("detected_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("dismissed", sa.Boolean(), nullable=False, server_default="false"),
    )


def downgrade() -> None:
    op.drop_table("contradictions")
    sa.Enum(name="contradiction_severity_enum").drop(op.get_bind())
    op.drop_table("meetings")
