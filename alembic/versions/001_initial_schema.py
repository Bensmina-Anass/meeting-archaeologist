"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-05-07
"""
from __future__ import annotations

import sqlalchemy as sa
from alembic import op
from pgvector.sqlalchemy import Vector
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import ENUM as PgEnum

revision = "001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE confidence_enum AS ENUM ('explicit', 'implied', 'tentative');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    """)

    op.create_table(
        "topics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("slug", sa.String(), nullable=False),
        sa.Column("display_name", sa.String(), nullable=False),
        sa.Column("embedding", Vector(768), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint("slug", name="uq_topics_slug"),
    )

    # HNSW index for fast approximate cosine-similarity search.
    # vector_cosine_ops matches the <=> operator used in queries.
    op.execute(
        "CREATE INDEX topics_embedding_hnsw "
        "ON topics USING hnsw (embedding vector_cosine_ops)"
    )

    op.create_table(
        "decisions",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("meeting_id", sa.String(), nullable=False),
        sa.Column("topic_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("verbatim_quote", sa.Text(), nullable=False),
        sa.Column(
            "confidence",
            PgEnum("explicit", "implied", "tentative", name="confidence_enum", create_type=False),
            nullable=False,
        ),
        sa.Column("participants", postgresql.ARRAY(sa.String()), nullable=False),
        sa.Column("decided_at", sa.String(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["topic_id"], ["topics.id"], name="fk_decisions_topic_id"),
    )


def downgrade() -> None:
    op.drop_table("decisions")
    op.execute("DROP INDEX IF EXISTS topics_embedding_hnsw")
    op.drop_table("topics")
    sa.Enum(name="confidence_enum").drop(op.get_bind())
    op.execute("DROP EXTENSION IF EXISTS vector")
