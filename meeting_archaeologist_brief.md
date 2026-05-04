# Meeting Archaeologist — Full Project Brief

## 1. General Idea

A passive AI agent that builds and maintains a **living memory of every decision a team makes across meetings**, automatically detects when new decisions contradict or drift from past ones, and surfaces those conflicts before they cause damage downstream.

**The core problem:** In real teams, decisions get reversed, refined, or contradicted across weeks of meetings. No one tracks it systematically. People remember different versions of "what we agreed on." Implementation work goes in conflicting directions. Arguments break out 3 weeks later about what was actually decided.

**The agent's job:** Be the team's institutional memory. Extract every decision from every meeting, store it as structured knowledge, and act as a watchdog that flags when the team is about to silently contradict itself.

**Why this wins a hackathon:**
- Solves a universal pain (every team has this problem)
- Demo is visually striking — show a contradiction being caught live
- Agentic behavior is obvious to judges (extraction → memory → reasoning → alert)
- Defensible technical depth (cross-temporal reasoning is non-trivial)

---

## 2. Features

### Core (must-have for demo)
1. **Meeting transcript ingestion** — accept text/audio, transcribe if needed
2. **Structured decision extraction** — pull out `{topic, decision, owner, date, rationale}` from raw transcripts
3. **Team memory store** — searchable database of all past decisions, organized by topic
4. **Contradiction detection** — when a new decision is logged, automatically check it against historical decisions on the same topic and flag conflicts
5. **Smart alerts** — when a contradiction is detected, notify the meeting attendees with both decisions side-by-side and ask: *intentional change or oversight?*
6. **Timeline view** — visual UI showing how decisions on each topic evolved over time

### Stretch (if time allows)
7. **Action item tracking** — extract tasks + owners + deadlines, track completion via integrations
8. **Open question tracker** — flag unresolved questions raised in meeting N, surface them in meeting N+1
9. **Pre-meeting brief** — before each meeting, generate a 1-pager of relevant past decisions on agenda topics
10. **Slack/Notion integration** — push memory and alerts to where the team actually works

---

## 3. Architecture

```
┌─────────────────┐
│  Transcript     │  (text file, recording, or live)
│  Source         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Extraction     │  LLM call → structured JSON
│  Agent          │  {topic, decision, owner, date}
└────────┬────────┘
         │
         ▼
┌─────────────────┐       ┌─────────────────┐
│  Memory Store   │◄──────┤  Vector DB      │
│  (PostgreSQL)   │       │  (pgvector)     │
└────────┬────────┘       └─────────────────┘
         │
         ▼
┌─────────────────┐
│  Contradiction  │  Group decisions by topic
│  Detector       │  → LLM reasoning over history
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Alert / UI     │  Slack message + dashboard
│  Layer          │
└─────────────────┘
```

---

## 4. Tools & Stack

### Backend
- **Python 3.11+** — main language
- **FastAPI** — REST API for the agent
- **PostgreSQL + pgvector** — structured storage + semantic search in one DB
- **SQLAlchemy** — ORM

### AI / Agent layer
- **Claude API (Sonnet 4.5)** or **GPT-4** — extraction and reasoning. Claude is better at structured extraction in my experience
- **LangChain** or **LlamaIndex** — only if you need orchestration. For 48h, you can skip frameworks and call the LLM API directly with well-crafted prompts. Frameworks add complexity you don't need at this scale
- **Pydantic** — enforce structured output schemas from the LLM

### Transcription (only if doing audio)
- **Whisper** (local, free) or **AssemblyAI** (API, faster setup) — speech-to-text
- For the hackathon, **use pre-made transcripts.** Don't waste time on audio pipelines

### Frontend
- **Next.js + Tailwind** if your team has React experience
- **Streamlit** if you want to ship in 4 hours instead of 12 — perfectly fine for a demo

### Integrations (stretch)
- **Slack Bolt SDK** — for alerts
- **Notion API** — for memory write-back
- **Google Calendar API** — for meeting triggers

### Dev / Infra
- **Docker Compose** — Postgres + app, easy local setup
- **GitHub** — version control + project board
- **ngrok** — expose local server for Slack webhooks during demo

---

## 5. What to Learn Before Starting

Given your background (data/ML eng, infra strong), here's what's actually new vs. what you can already do:

### You probably already know
- Python, FastAPI, Postgres, Docker
- ML fundamentals
- General system design

### Worth a focused refresh (1-2h each)
- **LLM structured output** — how to force JSON output reliably (function calling, JSON mode, Pydantic schemas with Instructor library). This is the single most important skill for this project
- **Prompt engineering for extraction** — few-shot examples, chain-of-thought for complex extraction, validation loops
- **pgvector basics** — embedding storage, cosine similarity queries, indexing (`CREATE INDEX USING ivfflat`)
- **Embeddings** — what they capture, model choice (OpenAI `text-embedding-3-small` is cheap and good enough)

### Worth deeper study (half day)
- **Agent design patterns** — specifically the **extract → store → retrieve → reason** loop. Read the ReAct paper if you haven't, and skim Anthropic's "Building effective agents" post
- **Evaluation of LLM extraction** — how do you know your decision extraction is accurate? Build a small labeled set (10-20 meeting snippets with ground-truth decisions) before you start. This will save you from shipping garbage

### You can skip
- Don't bother learning a full agent framework (LangGraph, CrewAI) for 48h. Direct API calls + good prompts beat framework overhead at this scale
- Don't learn fine-tuning. Prompting is enough

---

## 6. 48-Hour Execution Plan

### Hour 0-4: Setup + Data
- Repo, Docker Compose with Postgres+pgvector, FastAPI skeleton
- Collect/generate 5-6 fake meeting transcripts with a deliberately planted contradiction across them
- Define your Pydantic schemas for `Decision`, `Meeting`, `Contradiction`

### Hour 4-12: Extraction Pipeline
- Prompt + LLM call → structured decisions from transcript
- Store in Postgres with embeddings
- Validate on your test transcripts

### Hour 12-24: Contradiction Detection
- For each new decision: query past decisions on same topic (semantic + keyword)
- LLM call: "do these decisions conflict?" with the candidate set
- Store flagged contradictions

### Hour 24-36: UI + Alerts
- Streamlit or Next.js dashboard: meeting list, decision timeline per topic, contradiction inbox
- Slack webhook for live alerts (optional but high-impact for demo)

### Hour 36-44: Demo polish
- Scripted demo flow: ingest meeting 1, ingest meeting 2, watch contradiction get caught live
- Pre-load impressive seed data
- Record a backup video in case live demo breaks

### Hour 44-48: Pitch + buffer
- 3-min pitch script
- Slide deck (5 slides max: problem, demo, how it works, why now, what's next)

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Extraction quality is poor | Build a 20-example eval set in hour 1, iterate prompts against it |
| Contradiction detection has false positives | Tune via a confidence threshold + human-in-the-loop confirmation in UI |
| Demo feels abstract | Pre-script a story arc with planted contradictions; make stakes obvious |
| Scope creep into action items, integrations | Lock the must-have list at hour 0; only touch stretch features after hour 36 |

---

## 8. The Pitch Hook

> *"Every team has the same problem: decisions get quietly reversed across meetings, and no one notices until the damage is done. Slack threads scroll away. Notion docs go stale. Meeting Archaeologist is the agent that remembers everything your team has ever decided — and tells you the moment you're about to contradict yourselves."*
