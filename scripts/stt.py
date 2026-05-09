from __future__ import annotations

# Requires: uv pip install faster-whisper
# or add to pyproject.toml: [project.optional-dependencies] stt = ["faster-whisper>=1.0"]
#
# Speaker diarization is NOT included. It requires pyannote.audio (heavy, needs a
# HuggingFace token). The extractor works on plain text and still finds Decision: phrases.

import sys
from pathlib import Path
from typing import Annotated, Optional

import typer

sys.path.insert(0, str(Path(__file__).resolve().parent))
import _common  # noqa: F401

app = typer.Typer(add_completion=False)

_TRANSCRIPT_HEADER = """\
Meeting: {title}
Date: {date}
Attendees:

"""


@app.command()
def main(
    audio_path: Annotated[Path, typer.Argument(help="Audio file (.mp3, .wav, .m4a, .ogg)")],
    model: Annotated[
        str, typer.Option("--model", "-m", help="Whisper model size")
    ] = "base",
    output_dir: Annotated[
        Optional[Path],
        typer.Option("--output-dir", "-o", help="Output directory (default: data/transcripts)"),
    ] = None,
    language: Annotated[
        Optional[str],
        typer.Option("--language", "-l", help="Language code, e.g. 'en' (auto-detect if omitted)"),
    ] = None,
    device: Annotated[
        str, typer.Option("--device", help="Compute device: cpu or cuda")
    ] = "cpu",
):
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        typer.echo(
            "faster-whisper is not installed.\n"
            "Install it with:  uv pip install faster-whisper\n"
            "or add  faster-whisper>=1.0  to pyproject.toml under [project.optional-dependencies].",
            err=True,
        )
        raise typer.Exit(1)

    if not audio_path.exists():
        typer.echo(f"File not found: {audio_path}", err=True)
        raise typer.Exit(1)

    out_dir = output_dir or (_common.REPO_ROOT / "data" / "transcripts")
    out_dir.mkdir(parents=True, exist_ok=True)

    typer.echo(f"Loading Whisper model '{model}' on {device}...")
    # int8 keeps memory low on CPU; float16 is faster on CUDA.
    compute_type = "int8" if device == "cpu" else "float16"
    whisper = WhisperModel(model, device=device, compute_type=compute_type)

    typer.echo(f"Transcribing {audio_path.name}...")
    segments_gen, info = whisper.transcribe(
        str(audio_path),
        language=language,
        beam_size=5,
        word_timestamps=False,
    )

    lines: list[str] = []
    for seg in segments_gen:
        text = seg.text.strip()
        if text:
            lines.append(text)

    body = "\n".join(lines)
    word_count = len(body.split())

    title = audio_path.stem.replace("_", " ").title()
    header = _TRANSCRIPT_HEADER.format(title=title, date="")
    content = header + body + "\n"

    out_path = out_dir / (audio_path.stem + ".txt")
    out_path.write_text(content, encoding="utf-8")

    duration_min = info.duration / 60
    typer.echo(f"Output : {out_path.relative_to(_common.REPO_ROOT)}")
    typer.echo(f"Duration: {duration_min:.1f} min  |  Words: {word_count:,}")
    typer.echo(
        "\nNote: no speaker labels — diarization skipped (needs pyannote.audio + HF token).\n"
        "Fill in the Attendees: line and speaker labels manually before ingesting."
    )


app()
