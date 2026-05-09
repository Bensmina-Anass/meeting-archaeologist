from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Query

from app.ingestion.teams.config import Settings
from app.ingestion.teams.models import IngestStats
from app.ingestion.teams.transcripts import parse_window, run_ingestion

router = APIRouter(prefix="/ingestion/teams", tags=["ingestion"])


@router.post("/run", response_model=IngestStats)
async def run_teams_ingestion(
    since: Annotated[
        str,
        Query(description="Start of window: 7d, 24h, 30m, or ISO-8601 datetime"),
    ] = "7d",
    until: Annotated[
        str | None,
        Query(description="End of window: ISO-8601 datetime (default: now)"),
    ] = None,
    force: Annotated[
        bool,
        Query(description="Re-extract meetings that were already processed"),
    ] = False,
) -> IngestStats:
    since_dt = parse_window(since)
    until_dt = parse_window(until) if until else datetime.now(timezone.utc)
    settings = Settings()  # type: ignore[call-arg]
    return await run_ingestion(settings, since_dt, until_dt, force=force)
