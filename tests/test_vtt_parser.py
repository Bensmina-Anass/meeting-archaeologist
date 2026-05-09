from __future__ import annotations

from pathlib import Path

import pytest

from app.ingestion.vtt import _deduplicate, parse_vtt

FIXTURES = Path(__file__).parent.parent / "data" / "transcripts" / "vtt"


class TestDeduplicateUnit:
    def test_exact_duplicate_dropped(self):
        segs = [("Sara", "Hello"), ("Sara", "Hello")]
        assert _deduplicate(segs) == [("Sara", "Hello")]

    def test_superset_replaces_prev(self):
        segs = [("Sara", "Hello world"), ("Sara", "Hello world, how are you")]
        assert _deduplicate(segs) == [("Sara", "Hello world, how are you")]

    def test_prev_superset_drops_curr(self):
        segs = [("Sara", "Hello world, how are you"), ("Sara", "Hello world")]
        assert _deduplicate(segs) == [("Sara", "Hello world, how are you")]

    def test_overlap_spliced(self):
        # Teams rolling captions overlap by a phrase (≥6 chars), not a single word.
        # prev ends with "world today", curr starts with "world today and more".
        segs = [("Sara", "Hello world today"), ("Sara", "world today and more")]
        result = _deduplicate(segs)
        assert result == [("Sara", "Hello world today and more")]

    def test_different_speakers_not_merged(self):
        segs = [("Sara", "Hello"), ("Marc", "Hello")]
        assert _deduplicate(segs) == [("Sara", "Hello"), ("Marc", "Hello")]

    def test_empty(self):
        assert _deduplicate([]) == []


class TestParseVttMeeting01:
    """Integration test against the synthetic fixture."""

    def test_file_exists(self):
        assert (FIXTURES / "meeting_01.vtt").exists()

    def test_output_contains_speakers(self):
        result = parse_vtt(FIXTURES / "meeting_01.vtt")
        assert "Sara:" in result
        assert "Marc:" in result
        assert "Léa:" in result
        assert "David:" in result

    def test_decision_lines_present(self):
        result = parse_vtt(FIXTURES / "meeting_01.vtt")
        assert "two-week sprints" in result
        assert "auth and user management" in result.lower()

    def test_no_timing_lines(self):
        result = parse_vtt(FIXTURES / "meeting_01.vtt")
        assert "-->" not in result

    def test_no_webvtt_header(self):
        result = parse_vtt(FIXTURES / "meeting_01.vtt")
        lines = result.splitlines()
        assert not any(l.startswith("WEBVTT") for l in lines)

    def test_no_html_tags(self):
        result = parse_vtt(FIXTURES / "meeting_01.vtt")
        assert "<v " not in result
        assert "</v>" not in result

    def test_rolling_captions_deduplicated(self):
        # Cues 12-13 in meeting_01.vtt are the same speaker with cue13 being a
        # superset — the shorter one must not appear as a standalone line.
        result = parse_vtt(FIXTURES / "meeting_01.vtt")
        lines = result.splitlines()
        seen = set()
        for line in lines:
            assert line not in seen, f"Duplicate line: {line!r}"
            seen.add(line)

    def test_meeting02_contradiction_seed_present(self):
        result = parse_vtt(FIXTURES / "meeting_02.vtt")
        assert "single-cloud" in result.lower()
        assert "aws" in result.lower()

    def test_meeting05_reversal_present(self):
        result = parse_vtt(FIXTURES / "meeting_05.vtt")
        assert "multi-cloud" in result.lower() or "gcp" in result.lower()
        assert "kubernetes" in result.lower()

    def test_meeting05_marc_absent(self):
        result = parse_vtt(FIXTURES / "meeting_05.vtt")
        assert "Marc:" not in result
