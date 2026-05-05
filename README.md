# Meeting Archaeologist

A passive AI agent that builds a living memory of every decision a team makes across meetings, automatically detects contradictions, and surfaces conflicts before they cause damage.

## Stack

- Python 3.11+ / FastAPI
- PostgreSQL + pgvector
- SQLAlchemy + Pydantic
- Claude API (Anthropic)
- Docker Compose

## Structure

```
meeting-archaeologist/
├── app/
│   ├── main.py
│   ├── api/
│   ├── agents/
│   ├── models/
│   ├── db/
│   └── core/
├── frontend/
├── data/
│   └── transcripts/
├── evals/
└── tests/
```

## Roadmap

- [ ] Meeting transcript ingestion
- [ ] Structured decision extraction
- [ ] Team memory store
- [ ] Contradiction detection
- [ ] Smart alerts
- [ ] Timeline UI
