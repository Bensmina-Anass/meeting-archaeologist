from __future__ import annotations

import re
import sys
import time
from pathlib import Path
from typing import Annotated

import typer
from tabulate import tabulate

# Add scripts/ to path so _common is importable, then load .env before app imports.
sys.path.insert(0, str(Path(__file__).resolve().parent))
import _common  # noqa: F401

from sqlalchemy import delete, func, select

from app.agents.extractor import extract_meeting
from app.agents.merger import run_merge_pass
from app.db.models import Contradiction as DBContradiction, Decision as DBDecision, Meeting as DBMeeting, Topic as DBTopic
from app.ingestion.pipeline import ingest_transcript_text

app = typer.Typer(add_completion=False)


def _parse_retry_delay(exc: Exception) -> int:
    """Extract the suggested retry delay (seconds) from a 429 error, minimum 60s."""
    m = re.search(r"retryDelay['\"]:\s*['\"](\d+)s", str(exc))
    suggested = int(m.group(1)) if m else 0
    return max(suggested, 60)


def _ingest_with_retry(path: Path, dry_run: bool, force: bool, max_attempts: int = 5) -> dict | None:
    """Wrap _ingest_file with outer retry logic for 429 quota errors.

    Sleeps BEFORE each retry (not after the last failed attempt).
    """
    delay = 0
    for attempt in range(1, max_attempts + 1):
        if delay:
            typer.echo(
                f"\n  [rate-limit] 429 on attempt {attempt - 1}/{max_attempts}. "
                f"Sleeping {delay}s before retry...",
                err=True,
            )
            time.sleep(delay)
        try:
            return _ingest_file(path, dry_run=dry_run, force=force)
        except Exception as exc:
            if "429" not in str(exc) and "RESOURCE_EXHAUSTED" not in str(exc):
                raise
            delay = _parse_retry_delay(exc)
    typer.echo(
        f"\n  [rate-limit] giving up on {path.name} after {max_attempts} attempts.",
        err=True,
    )
    return None


def _parse_header(text: str) -> dict:
    """Extract Meeting/Date/Attendees from the transcript header lines."""
    import re
    header: dict = {}
    for line in text.splitlines()[:10]:
        if m := re.match(r"^Meeting:\s*(.+)", line):
            header["title"] = m.group(1).strip()
        elif m := re.match(r"^Date:\s*(.+)", line):
            header["started_at"] = m.group(1).strip() or None
        elif m := re.match(r"^Attendees:\s*(.+)", line):
            # "Sara (CEO), Léa (PM)" → ["Sara", "Léa"]
            header["attendees"] = [
                re.sub(r"\s*\(.*?\)", "", name).strip()
                for name in m.group(1).split(",")
                if name.strip()
            ]
    return header


def _ingest_file(path: Path, dry_run: bool, force: bool) -> dict | None:
    meeting_id = path.stem
    text = path.read_text()

    if not dry_run:
        with _common.db_session() as session:
            existing = session.execute(
                select(func.count())
                .select_from(DBDecision)
                .where(DBDecision.meeting_id == meeting_id)
            ).scalar_one()
        if existing and not force:
            typer.echo(
                f"  {path.name}: already ingested ({existing} decisions)."
                " Use --force to re-ingest."
            )
            return None

    t0 = time.perf_counter()

    if dry_run:
        extraction = extract_meeting(text, meeting_id)
        elapsed = time.perf_counter() - t0
        return {
            "meeting": meeting_id,
            "decisions": len(extraction.decisions),
            "new_topics": "—",
            "matched": "—",
            "time": f"{elapsed:.1f}s",
        }

    with _common.db_session() as session:
        topics_before = session.execute(
            select(func.count()).select_from(DBTopic)
        ).scalar_one()

        header = _parse_header(text)
        meeting_metadata = {
            "meeting_id": meeting_id,
            "title": header.get("title") or meeting_id.replace("_", " ").title(),
            "source": "manual",
            "started_at": header.get("started_at"),
            "attendees": header.get("attendees", []),
        }
        extraction = ingest_transcript_text(text, meeting_metadata, session)

        topics_after = session.execute(
            select(func.count()).select_from(DBTopic)
        ).scalar_one()
        n_new = topics_after - topics_before

    elapsed = time.perf_counter() - t0
    return {
        "meeting": meeting_id,
        "decisions": len(extraction.decisions),
        "new_topics": n_new,
        "matched": len(extraction.decisions) - n_new,
        "time": f"{elapsed:.1f}s",
    }


@app.command()
def main(
    path: Annotated[
        Path, typer.Argument(help="Transcript .txt file or directory of .txt files")
    ],
    dry_run: Annotated[
        bool, typer.Option("--dry-run", help="Extract without writing to DB")
    ] = False,
    force: Annotated[
        bool,
        typer.Option("--force", help="Re-ingest meetings that already have decisions"),
    ] = False,
    run_merger: Annotated[
        bool,
        typer.Option("--run-merger", help="Merge near-duplicate topics after ingestion"),
    ] = False,
    reset_topics: Annotated[
        bool,
        typer.Option(
            "--reset-topics",
            help="Wipe topics/decisions/contradictions tables before re-ingesting. "
            "Requires path to be a directory.",
        ),
    ] = False,
):
    if reset_topics:
        if not path.is_dir():
            typer.echo("--reset-topics requires a directory path, not a single file.", err=True)
            raise typer.Exit(1)
        typer.echo("Wiping contradictions, decisions, and topics tables...")
        with _common.db_session() as session:
            session.execute(delete(DBContradiction))
            session.execute(delete(DBDecision))
            session.execute(delete(DBTopic))
            session.commit()
        typer.echo("Done. Re-ingesting all transcripts with 4 s delay between meetings.\n")
        force = True  # all meetings now have no decisions, skip the existing-check

    paths = sorted(path.glob("*.txt")) if path.is_dir() else [path]
    if not paths:
        typer.echo("No .txt files found.", err=True)
        raise typer.Exit(1)

    inter_meeting_sleep = 20 if reset_topics else 0

    rows = []
    for i, p in enumerate(paths):
        if inter_meeting_sleep and i > 0:
            time.sleep(inter_meeting_sleep)
        typer.echo(f"  {p.name} ...", nl=False)
        row = _ingest_with_retry(p, dry_run=dry_run, force=force)
        if row is None:
            typer.echo("")
            continue
        rows.append(row)
        typer.echo(f" {row['decisions']} decision(s) [{row['time']}]")

    if rows:
        print()
        print(tabulate(rows, headers="keys", tablefmt="simple"))

    if run_merger and not dry_run:
        print()
        with _common.db_session() as session:
            n = run_merge_pass(session)
            session.commit()
        print(f"Merger: {n} topic(s) consolidated.")

    if dry_run:
        print("\n[dry-run] No writes performed.")


app()
