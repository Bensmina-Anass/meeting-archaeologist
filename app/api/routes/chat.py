from __future__ import annotations

import os
from collections.abc import AsyncIterator
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from google import genai
from google.genai import types
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import get_db
from app.db.models import Contradiction, Decision, Meeting, Topic

router = APIRouter(prefix="/meetings", tags=["chat"])

MODEL = "gemini-2.5-flash"


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]


# ── Context builder ───────────────────────────────────────────────────────────

def _build_system_prompt(
    meeting: Meeting,
    decisions_with_topics: list[tuple[Decision, Topic | None]],
    contradictions: list[dict],
) -> str:
    parts: list[str] = []

    date_str = meeting.started_at.strftime("%Y-%m-%d") if meeting.started_at else "unknown date"
    parts.append(f"# Meeting: {meeting.title} ({date_str})")
    if meeting.attendees:
        parts.append(f"Attendees: {', '.join(meeting.attendees)}")

    parts.append("\n## Decisions logged")
    if decisions_with_topics:
        for dec, topic in decisions_with_topics:
            slug = topic.slug if topic else "uncategorized"
            decided = dec.decided_at or date_str
            owner = dec.participants[0] if dec.participants else "unassigned"
            parts.append(
                f"- [{slug} | {decided} | owner: {owner}]\n"
                f"  {dec.summary}\n"
                f"  Quote: \"{dec.verbatim_quote}\""
            )
    else:
        parts.append("No decisions were extracted from this meeting.")

    if contradictions:
        parts.append("\n## Contradictions involving this meeting")
        for c in contradictions:
            parts.append(
                f"- Topic: {c['topic']}\n"
                f"  This meeting decided: \"{c['this_decision']}\"\n"
                f"  Contradicts {c['other_meeting_title']} ({c['other_meeting_date']}): "
                f"\"{c['other_decision']}\"\n"
                f"  Severity: {c['severity']} — {c['explanation']}"
            )

    if meeting.transcript:
        parts.append("\n## Full transcript")
        parts.append(meeting.transcript)

    parts.append(
        "\n---\n"
        "You are the Meeting Archaeologist, an AI assistant scoped to this single meeting.\n\n"
        "Rules:\n"
        "1. Answer ONLY from the context above (decisions, contradictions, transcript). "
        "If the answer is not in the provided context, say so.\n"
        "2. Cite decisions inline as: (Decision: <topic>, <date>).\n"
        "3. When the user asks about a topic that has a known contradiction, surface it proactively.\n"
        "4. Be concise — no filler, no preamble."
    )

    return "\n".join(parts)


def _load_contradiction_data(
    decision_ids: set,
    db: Session,
    meeting_date_str: str,
) -> list[dict]:
    if not decision_ids:
        return []

    rows = db.execute(
        select(Contradiction)
        .where(
            Contradiction.dismissed.is_(False),
            (
                Contradiction.decision_a_id.in_(decision_ids)
                | Contradiction.decision_b_id.in_(decision_ids)
            ),
        )
    ).scalars().all()

    result: list[dict] = []
    for c in rows:
        if c.decision_a_id in decision_ids:
            this_dec = db.get(Decision, c.decision_a_id)
            other_dec = db.get(Decision, c.decision_b_id)
        else:
            this_dec = db.get(Decision, c.decision_b_id)
            other_dec = db.get(Decision, c.decision_a_id)

        if not this_dec or not other_dec:
            continue

        other_meeting = db.get(Meeting, other_dec.meeting_id)
        topic = db.get(Topic, c.topic_id)
        result.append({
            "topic": topic.slug if topic else "unknown",
            "this_decision": this_dec.summary,
            "other_decision": other_dec.summary,
            "other_meeting_title": other_meeting.title if other_meeting else other_dec.meeting_id,
            "other_meeting_date": (
                other_meeting.started_at.strftime("%Y-%m-%d")
                if other_meeting and other_meeting.started_at
                else "unknown"
            ),
            "severity": c.severity,
            "explanation": c.explanation,
        })

    return result


# ── Route ─────────────────────────────────────────────────────────────────────

@router.post("/{meeting_id}/chat")
async def chat_meeting(
    meeting_id: str,
    body: ChatRequest,
    db: Session = Depends(get_db),
) -> StreamingResponse:
    meeting = db.get(Meeting, meeting_id)
    if meeting is None:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if not body.messages:
        raise HTTPException(status_code=422, detail="messages must not be empty")

    # Decisions + topics
    rows = db.execute(
        select(Decision, Topic)
        .outerjoin(Topic, Decision.topic_id == Topic.id)
        .where(Decision.meeting_id == meeting_id)
        .order_by(Decision.created_at)
    ).all()
    decisions_with_topics: list[tuple[Decision, Topic | None]] = [
        (r.Decision, r.Topic) for r in rows
    ]

    decision_ids = {dec.id for dec, _ in decisions_with_topics}
    date_str = meeting.started_at.strftime("%Y-%m-%d") if meeting.started_at else "unknown"
    contradiction_data = _load_contradiction_data(decision_ids, db, date_str)

    system_prompt = _build_system_prompt(meeting, decisions_with_topics, contradiction_data)

    contents = [
        {
            "role": "user" if m.role == "user" else "model",
            "parts": [{"text": m.content}],
        }
        for m in body.messages
    ]

    async def _stream() -> AsyncIterator[str]:
        client = genai.Client(api_key=os.environ["GOOGLE_API_KEY"])
        async for chunk in await client.aio.models.generate_content_stream(
            model=MODEL,
            contents=contents,
            config=types.GenerateContentConfig(system_instruction=system_prompt),
        ):
            if chunk.text:
                yield chunk.text

    return StreamingResponse(_stream(), media_type="text/plain; charset=utf-8")
