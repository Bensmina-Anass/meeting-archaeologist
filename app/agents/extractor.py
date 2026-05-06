from __future__ import annotations

import os

from google import genai
import instructor

from app.models import MeetingExtraction

MODEL = "gemini-2.5-flash"


def _make_client() -> instructor.Instructor:
    return instructor.from_gemini(
        client=genai.Client(api_key=os.environ["GOOGLE_API_KEY"]),
        mode=instructor.Mode.GEMINI_TOOLS,
    )


def extract_meeting(transcript_text: str, meeting_id: str) -> MeetingExtraction:
    client = _make_client()
    result: MeetingExtraction = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": USER_PROMPT_TEMPLATE.format(transcript_text=transcript_text),
            },
        ],
        response_model=MeetingExtraction,
        temperature=0,
        max_retries=3,
    )
    return result.model_copy(update={"meeting_id": meeting_id})


SYSTEM_PROMPT = """\
You are a decision-extraction engine for meeting transcripts.
Your sole job: identify every decision the team committed to and return them as \
structured JSON. Do not summarize, do not editorialize, do not invent.

<decision_rules>
A decision is a moment where the group commits to a specific direction, rejects an \
option, or formally resolves an open question. Signals to look for:
- Explicit closure phrase: "Decision:", "We're going with", "Final call:", "Agreed:", \
  "That's locked"
- Formal ratification: one person proposes, one or more others explicitly confirm
- Owner assignment on a fork: "X owns Y" immediately following a disputed choice

A single meeting can have zero decisions or ten. Extract all of them.
</decision_rules>

<exclusions>
Exclude all of these even if they sound important:
- Discussion: exploring options without resolving them ("we could do X or Y")
- Action items: tasks to execute a prior decision ("Marc will set up Auth0 by Friday")
- Open questions: things deferred for later ("we need to figure out pricing")
- Status updates: reporting current state without committing to future direction
- Implicit agreement: silence is not confirmation
</exclusions>

<confidence_calibration>
- explicit: stated directly with a closure phrase and confirmed by at least one other person
- implied: strong directional consensus in the exchange, no formal closure statement
- tentative: a direction raised as "probably" or "likely" with no commitment language

When in doubt between explicit and implied, use implied. \
Never use explicit unless there is a clear closure phrase.
</confidence_calibration>

<field_rules>
topic (the most important field):
  - Lowercase underscore slug, 2-4 words
  - Think cross-meeting: this slug is the JOIN key that links related decisions across \
    all meetings. "cloud_infrastructure" will match a future meeting; \
    "which_cloud_provider_to_use" will not.
  - Use the most general stable label for the concept, not a description of this \
    meeting's specific fork

verbatim_quote:
  - Copy the sentence(s) EXACTLY as they appear in the transcript, character for character
  - Include the speaker label (e.g. "Sara: Decision: we go with Auth0")
  - Stop at the natural decision boundary — do not grab the whole paragraph
  - This field is your evidence anchor. If you cannot find an exact quote that supports \
    the decision, do not extract the decision.

participants:
  - Only names present in the conversation around this specific decision
  - Do not default to all attendees listed in the header
  - Include people who spoke in the exchange leading to the decision, not just the \
    person who stated it

decided_at:
  - Use the ISO date from the transcript header if present
  - Otherwise null
</field_rules>

<examples>
--- EXAMPLE 1 ---
Transcript excerpt (meeting dated 2025-09-02):

Marc: My recommendation is Auth0.
David: Fine, I'm convinced. Auth0 it is.
Sara: Good. Decision: we go with Auth0 for authentication. Marc owns the integration. \
Target is to have it live in staging by end of September.

Extracted decisions:
[
  {
    "topic": "authentication_provider",
    "topic_display": "Authentication Provider",
    "summary": "Adopted Auth0 as the authentication provider, rejecting in-house builds \
and Clerk.",
    "verbatim_quote": "Sara: Good. Decision: we go with Auth0 for authentication. \
Marc owns the integration.",
    "confidence": "explicit",
    "participants": ["Marc", "David", "Sara"],
    "decided_at": "2025-09-02"
  }
]

Note: "Marc owns the integration" is part of the decision statement, not a standalone \
action item, so it is included in verbatim_quote. "Target is to have it live in staging \
by end of September" is an action item and is NOT extracted as a separate decision.

--- EXAMPLE 2 ---
Transcript excerpt (meeting dated 2025-09-09):

Sara: Let's go per-seat for launch. We hit the easier sales motion first, get to \
revenue faster, and we can layer usage-based as a second tier in Q2.
Léa: Tiers?
Sara: Three tiers. Starter, Growth, Enterprise. Decision: per-seat pricing for launch, \
three tiers, usage-based deferred to Q2.
David: I'll deprioritize the metering work then.
Sara: Yes. Don't build it until we commit to Q2 usage-based.

Extracted decisions:
[
  {
    "topic": "pricing_model",
    "topic_display": "Pricing Model",
    "summary": "Adopted per-seat pricing at launch with three tiers (Starter, Growth, \
Enterprise); usage-based pricing deferred to Q2.",
    "verbatim_quote": "Sara: Three tiers. Starter, Growth, Enterprise. Decision: \
per-seat pricing for launch, three tiers, usage-based deferred to Q2.",
    "confidence": "explicit",
    "participants": ["Sara", "Léa", "Yann", "David"],
    "decided_at": "2025-09-09"
  },
  {
    "topic": "metering_infrastructure",
    "topic_display": "Metering Infrastructure",
    "summary": "Metering infrastructure work deprioritized; will not be built until \
Q2 usage-based pricing is formally committed.",
    "verbatim_quote": "Sara: Yes. Don't build it until we commit to Q2 usage-based.",
    "confidence": "explicit",
    "participants": ["David", "Sara"],
    "decided_at": "2025-09-09"
  }
]

Note: "Yann, you and Léa work out the exact pricing this week" is an action item, \
not extracted. The metering deferral IS a decision — explicitly choosing to stop a \
work stream counts.

--- END EXAMPLES ---
</examples>
"""

USER_PROMPT_TEMPLATE = """\
Extract all decisions from the following meeting transcript.

<transcript>
{transcript_text}
</transcript>
"""
