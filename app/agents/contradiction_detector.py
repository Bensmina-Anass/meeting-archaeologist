from __future__ import annotations

import os
from typing import Literal

import structlog
from google import genai
import instructor
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.models import Contradiction, Decision, Topic

log = structlog.get_logger(__name__)

MODEL = "gemini-2.5-flash"


# ── Instructor response schema ────────────────────────────────────────────────

class _ContradictionMatch(BaseModel):
    # prior_decision_id is included in the prompt context so Gemini can reference
    # it; we map back to the real UUID after the call.
    prior_decision_index: int
    explanation: str
    # severity maps to DB enum; the Pydantic Contradiction model uses
    # minor/major/reversal but that schema is for display — keep DB as low/medium/high.
    severity: Literal["low", "medium", "high"]


class _DetectionResult(BaseModel):
    contradictions: list[_ContradictionMatch]


# ── Prompts ───────────────────────────────────────────────────────────────────

_SYSTEM_PROMPT = """\
You are a contradiction-detection engine for meeting decisions.

Your job: given a NEW decision and a list of PRIOR decisions on the same topic, \
identify which prior decisions (if any) directly contradict the new one.

<what_counts_as_a_contradiction>
A contradiction exists only when the new decision and a prior decision are \
mutually exclusive choices — implementing both would be impossible without \
reversing one of them.

Count as contradictions:
- Direct reversals: "use REST" → "use GraphQL"
- Mutually exclusive choices on the same dimension: "single-cloud AWS" → "multi-cloud AWS+GCP"
- Explicit rejection of what was previously adopted

Do NOT count as contradictions:
- Refinements: "JWT tokens" → "JWT tokens with 24h expiry" (same direction, more detail)
- Scope clarifications: "Auth0 for auth" → "Auth0 for auth, SAML profile only"
- Extensions: adding a second tool alongside an already-adopted one (unless the first was chosen *instead of* others)
- Action items or schedule changes
</what_counts_as_a_contradiction>

<severity_guide>
low    — decisions are technically in tension but could be reconciled with minor rework
medium — one decision would need to be abandoned or significantly changed to allow both
high   — direct reversal; implementing both is logically impossible
</severity_guide>

<examples>
--- EXAMPLE 1: CONTRADICTION (high severity) ---
Prior [0]: "Decision: we go single-cloud AWS only. No GCP, no Azure."
New: "Decision: multi-cloud deployment, AWS EKS primary, GCP GKE for DR."
→ IS a contradiction (high). Single-cloud vs. multi-cloud are mutually exclusive strategies.
Output: { "contradictions": [{"prior_decision_index": 0, "explanation": "Prior decision \
explicitly chose single-cloud AWS and rejected multi-cloud. The new decision adds GCP as \
a second cloud provider, directly reversing that commitment.", "severity": "high"}] }

--- EXAMPLE 2: NOT A CONTRADICTION (refinement) ---
Prior [0]: "Decision: Postgres on RDS for the primary database."
New: "Decision: Postgres on RDS, multi-AZ, with point-in-time recovery enabled."
→ NOT a contradiction. The new decision is a refinement of the same choice, \
adding configuration detail without reversing direction.
Output: { "contradictions": [] }

--- EXAMPLE 3: NOT A CONTRADICTION (different dimension) ---
Prior [0]: "Decision: Auth0 for authentication."
New: "Decision: Stripe for payment processing."
→ NOT a contradiction. These cover different problem domains.
Output: { "contradictions": [] }
</examples>

Return ONLY the JSON object. No explanation outside the JSON.
"""

_USER_TEMPLATE = """\
TOPIC: {topic_slug}

PRIOR DECISIONS (index → summary):
{prior_list}

NEW DECISION:
{new_summary}

Which prior decisions (if any) contradict the new decision?
"""


# ── Client factory ────────────────────────────────────────────────────────────

def _make_client() -> instructor.Instructor:
    return instructor.from_genai(
        client=genai.Client(api_key=os.environ["GOOGLE_API_KEY"]),
        mode=instructor.Mode.GENAI_TOOLS,
    )


# ── Public function ───────────────────────────────────────────────────────────

def detect_contradictions(
    new_decision: Decision,
    topic: Topic,
    db: Session,
) -> list[Contradiction]:
    """Detect contradictions between *new_decision* and all prior decisions on *topic*.

    Fetches all same-topic decisions that aren't *new_decision*, sends them to
    Gemini 2.5 Flash, persists any contradictions found, and returns the DB rows.
    Flushes but does not commit.
    """
    prior: list[Decision] = list(
        db.execute(
            select(Decision)
            .where(Decision.topic_id == topic.id)
            .where(Decision.id != new_decision.id)
            .order_by(Decision.created_at)
        ).scalars()
    )

    if not prior:
        return []

    prior_list = "\n".join(
        f"[{i}] {d.summary} (meeting: {d.meeting_id})"
        for i, d in enumerate(prior)
    )

    client = _make_client()
    result: _DetectionResult = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": _USER_TEMPLATE.format(
                    topic_slug=topic.slug,
                    prior_list=prior_list,
                    new_summary=new_decision.summary,
                ),
            },
        ],
        response_model=_DetectionResult,
        max_retries=2,
    )

    created: list[Contradiction] = []
    for match in result.contradictions:
        if match.prior_decision_index >= len(prior):
            log.warning(
                "contradiction_index_out_of_range",
                index=match.prior_decision_index,
                prior_count=len(prior),
            )
            continue

        prior_decision = prior[match.prior_decision_index]
        contradiction = Contradiction(
            topic_id=topic.id,
            decision_a_id=prior_decision.id,
            decision_b_id=new_decision.id,
            explanation=match.explanation,
            severity=match.severity,
        )
        db.add(contradiction)
        created.append(contradiction)
        log.info(
            "contradiction_detected",
            topic=topic.slug,
            decision_a=str(prior_decision.id),
            decision_b=str(new_decision.id),
            severity=match.severity,
        )

    db.flush()
    return created
