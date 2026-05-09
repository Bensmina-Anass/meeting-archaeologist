from __future__ import annotations

import asyncio
from typing import Annotated

import typer

from app.ingestion.teams.config import Settings
from app.ingestion.teams.transcripts import parse_window, run_ingestion

app = typer.Typer(add_completion=False)


@app.command()
def ingest(
    since: Annotated[
        str,
        typer.Option("--since", help="Start of window: 7d, 24h, 30m, or ISO-8601 datetime"),
    ] = "7d",
    until: Annotated[
        str | None,
        typer.Option("--until", help="End of window: ISO-8601 datetime (default: now)"),
    ] = None,
) -> None:
    since_dt = parse_window(since)
    until_dt = parse_window(until) if until else None

    typer.echo(f"Ingesting Teams meetings from {since_dt.isoformat()} ...")
    settings = Settings()  # type: ignore[call-arg]
    stats = asyncio.run(run_ingestion(settings, since_dt, until_dt))
    typer.echo(
        f"Done — meetings: {stats.meetings_found}  "
        f"transcripts: {stats.transcripts_found}  "
        f"written: {stats.written}  "
        f"skipped: {stats.skipped}"
    )


app()
