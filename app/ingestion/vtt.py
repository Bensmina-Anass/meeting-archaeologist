from __future__ import annotations

import re
from pathlib import Path

_TIMING_LINE = re.compile(
    r"^\d{2}:\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}:\d{2}\.\d{3}"
)
# <v Speaker Name>text</v>  — Teams always uses this form
_SPEAKER_TAG = re.compile(r"^<v ([^>]+)>(.*?)(?:</v>)?$", re.DOTALL)
# Any remaining HTML-like tags after stripping speaker tags
_HTML_TAG = re.compile(r"<[^>]+>")


def parse_vtt(path: Path) -> str:
    """Parse a WebVTT file (Teams format) into clean ``Speaker: text`` plaintext.

    Teams exports use rolling captions: each cue extends the previous one by a
    few words before the transcript buffer is flushed.  _deduplicate() collapses
    those overlaps so the final text reads like a normal transcript.
    """
    raw = path.read_text(encoding="utf-8")
    lines = raw.splitlines()

    segments: list[tuple[str, str]] = []  # (speaker, text)
    in_cue = False
    skip_block = False

    for line in lines:
        stripped = line.strip()

        if stripped.startswith("WEBVTT"):
            continue

        # STYLE / NOTE blocks end at the next blank line
        if stripped.startswith(("STYLE", "NOTE")):
            skip_block = True
            continue

        if skip_block:
            if stripped == "":
                skip_block = False
            continue

        if stripped == "":
            in_cue = False
            continue

        if _TIMING_LINE.match(stripped):
            in_cue = True
            continue

        # Cue identifier (numeric or UUID) sits before the timing line
        if not in_cue:
            continue

        m = _SPEAKER_TAG.match(stripped)
        if m:
            speaker = m.group(1).strip()
            text = _HTML_TAG.sub("", m.group(2)).strip()
        else:
            speaker = ""
            text = _HTML_TAG.sub("", stripped).strip()

        if text:
            segments.append((speaker, text))

    deduped = _deduplicate(segments)
    return "\n".join(
        f"{sp}: {txt}" if sp else txt for sp, txt in deduped
    )


def _overlap_suffix_len(prev: str, curr: str, min_len: int = 6) -> int:
    """Return the length of the longest suffix of *prev* that is a prefix of *curr*."""
    max_check = min(len(prev), len(curr))
    for n in range(max_check, min_len - 1, -1):
        if prev.endswith(curr[:n]):
            return n
    return 0


def _deduplicate(segments: list[tuple[str, str]]) -> list[tuple[str, str]]:
    """Collapse Teams rolling-caption overlaps.

    For consecutive same-speaker cues:
    - If curr is a strict superset (prev is a prefix of curr): replace prev.
    - If prev is a strict superset (curr is a prefix of prev): drop curr.
    - If the end of prev overlaps the start of curr: splice, keeping only the new tail.
    """
    if not segments:
        return []

    result: list[tuple[str, str]] = [segments[0]]

    for speaker, text in segments[1:]:
        prev_sp, prev_txt = result[-1]

        if speaker != prev_sp:
            result.append((speaker, text))
            continue

        if text == prev_txt:
            # Exact duplicate — drop
            continue

        if text.startswith(prev_txt):
            # curr is a superset: prev was a partial capture, keep curr
            result[-1] = (speaker, text)
            continue

        if prev_txt.startswith(text):
            # prev is already the fuller version: drop curr
            continue

        overlap = _overlap_suffix_len(prev_txt, text)
        if overlap > 0:
            # Splice: append only the non-overlapping tail of curr
            result[-1] = (speaker, prev_txt + text[overlap:])
        else:
            result.append((speaker, text))

    return result
