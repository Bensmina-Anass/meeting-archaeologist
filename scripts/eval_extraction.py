from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Annotated

import numpy as np
import typer
from tabulate import tabulate

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _common  # noqa: F401

from app.agents.embedder import embed_text
from app.agents.extractor import extract_meeting
from app.models import Decision as PydanticDecision

app = typer.Typer(add_completion=False)

DEFAULT_GT = _common.REPO_ROOT / "evals" / "ground_truth.json"
_CONF_LEVELS = ["explicit", "implied", "tentative"]


# ── matching helpers ──────────────────────────────────────────────────────────


def _cosine(a: list[float], b: list[float]) -> float:
    va, vb = np.array(a, dtype=np.float32), np.array(b, dtype=np.float32)
    denom = np.linalg.norm(va) * np.linalg.norm(vb)
    return float(np.dot(va, vb) / denom) if denom > 0 else 0.0


def _greedy_match(
    expected: list[dict],
    extracted: list[PydanticDecision],
    threshold: float,
) -> tuple[list[tuple[int, int, float]], set[int], set[int]]:
    """
    Greedy bipartite match by summary embedding cosine similarity.
    Returns (matches, unmatched_expected_idxs, unmatched_extracted_idxs).
    Each index appears in at most one match.
    """
    if not expected or not extracted:
        return [], set(range(len(expected))), set(range(len(extracted)))

    typer.echo("    Embedding summaries...", nl=False)
    exp_embs = [embed_text(e["summary"]) for e in expected]
    ext_embs = [embed_text(d.summary) for d in extracted]
    typer.echo(f" done ({len(exp_embs) + len(ext_embs)} calls)")

    sim = np.array([[_cosine(a, b) for b in ext_embs] for a in exp_embs])

    matched_exp: set[int] = set()
    matched_ext: set[int] = set()
    matches: list[tuple[int, int, float]] = []

    # Highest-similarity pairs first; each side used at most once.
    candidates = sorted(
        ((float(sim[i, j]), i, j) for i in range(len(expected)) for j in range(len(extracted))),
        reverse=True,
    )
    for score, i, j in candidates:
        if score < threshold:
            break
        if i in matched_exp or j in matched_ext:
            continue
        matches.append((i, j, score))
        matched_exp.add(i)
        matched_ext.add(j)

    return (
        matches,
        set(range(len(expected))) - matched_exp,
        set(range(len(extracted))) - matched_ext,
    )


# ── main ─────────────────────────────────────────────────────────────────────


@app.command()
def main(
    ground_truth: Annotated[
        Path, typer.Option("--ground-truth", "-g", help="Ground truth JSON file")
    ] = DEFAULT_GT,
    threshold: Annotated[
        float,
        typer.Option("--threshold", "-t", help="Cosine similarity threshold for a match"),
    ] = 0.8,
    verbose: Annotated[
        bool, typer.Option("--verbose", "-v", help="Print missed and spurious decisions")
    ] = False,
):
    if not ground_truth.exists():
        typer.echo(f"Ground truth not found: {ground_truth}", err=True)
        raise typer.Exit(1)

    entries: list[dict] = json.loads(ground_truth.read_text())

    table_rows: list[dict] = []
    conf_pairs: list[tuple[str, str]] = []  # (expected_conf, predicted_conf) for matched pairs
    agg_expected = agg_extracted = agg_matched = agg_slug_hits = 0

    for entry in entries:
        tid: str = entry["transcript_id"]
        expected: list[dict] = entry["expected_decisions"]
        transcript_path = _common.TRANSCRIPTS_DIR / f"{tid}.txt"

        if not transcript_path.exists():
            typer.echo(f"  [skip] {tid}: transcript not found at {transcript_path}", err=True)
            continue

        typer.echo(f"  {tid}")
        text = transcript_path.read_text()
        extraction = extract_meeting(text, tid)
        extracted = extraction.decisions

        matches, unmatched_exp, unmatched_ext = _greedy_match(expected, extracted, threshold)

        n_exp = len(expected)
        n_ext = len(extracted)
        n_match = len(matches)

        precision = n_match / n_ext if n_ext else 1.0
        recall = n_match / n_exp if n_exp else 1.0
        f1 = 2 * precision * recall / (precision + recall) if (precision + recall) else 0.0

        slug_hits = sum(
            1 for ei, xi, _ in matches if expected[ei]["topic_slug"] == extracted[xi].topic
        )
        slug_acc = slug_hits / n_match if n_match else float("nan")

        for ei, xi, _ in matches:
            conf_pairs.append((expected[ei]["confidence"], extracted[xi].confidence))

        agg_expected += n_exp
        agg_extracted += n_ext
        agg_matched += n_match
        agg_slug_hits += slug_hits

        table_rows.append(
            {
                "transcript": tid,
                "expected": n_exp,
                "extracted": n_ext,
                "matched": n_match,
                "precision": f"{precision:.2f}",
                "recall": f"{recall:.2f}",
                "F1": f"{f1:.2f}",
                "slug_acc": f"{slug_acc:.2f}" if not np.isnan(slug_acc) else "—",
            }
        )

        if verbose:
            for i in unmatched_exp:
                d = expected[i]
                typer.echo(
                    f"    MISSED   [{d['topic_slug']}] {d['summary'][:90]}"
                )
            for j in unmatched_ext:
                d = extracted[j]
                typer.echo(
                    f"    SPURIOUS [{d.topic}] {d.summary[:90]}"
                )

    if not table_rows:
        typer.echo("No entries evaluated.")
        raise typer.Exit(1)

    # Aggregate row
    agg_prec = agg_matched / agg_extracted if agg_extracted else 1.0
    agg_rec = agg_matched / agg_expected if agg_expected else 1.0
    agg_f1 = (
        2 * agg_prec * agg_rec / (agg_prec + agg_rec) if (agg_prec + agg_rec) else 0.0
    )
    agg_slug = agg_slug_hits / agg_matched if agg_matched else float("nan")
    table_rows.append(
        {
            "transcript": "AGGREGATE",
            "expected": agg_expected,
            "extracted": agg_extracted,
            "matched": agg_matched,
            "precision": f"{agg_prec:.2f}",
            "recall": f"{agg_rec:.2f}",
            "F1": f"{agg_f1:.2f}",
            "slug_acc": f"{agg_slug:.2f}" if not np.isnan(agg_slug) else "—",
        }
    )

    print()
    print(tabulate(table_rows, headers="keys", tablefmt="simple"))

    # Confidence confusion matrix (only when there are matched pairs)
    if conf_pairs:
        matrix = {e: {p: 0 for p in _CONF_LEVELS} for e in _CONF_LEVELS}
        for exp_c, pred_c in conf_pairs:
            if exp_c in matrix and pred_c in matrix[exp_c]:
                matrix[exp_c][pred_c] += 1

        cm_rows = [{"expected \\ predicted": lvl, **matrix[lvl]} for lvl in _CONF_LEVELS]
        print("\nConfidence confusion matrix:")
        print(tabulate(cm_rows, headers="keys", tablefmt="simple"))


app()
