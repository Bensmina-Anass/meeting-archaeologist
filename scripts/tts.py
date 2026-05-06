import asyncio
import re
import subprocess
import tempfile
from pathlib import Path

import edge_tts

TRANSCRIPTS_DIR = Path(__file__).parent.parent / "data" / "transcripts"
AUDIO_DIR = Path(__file__).parent.parent / "data" / "audio"

# One voice per speaker
SPEAKER_VOICES: dict[str, str] = {
    "Sara":  "en-US-AriaNeural",
    "Marc":  "en-US-AndrewNeural",
    "Léa":   "en-US-JennyNeural",
    "David": "en-US-BrianNeural",
    "Inès":  "en-US-EmmaNeural",
    "Karim": "en-US-GuyNeural",
    "Yann":  "en-US-ChristopherNeural",
}
DEFAULT_VOICE = "en-US-AriaNeural"

SPEAKER_RE = re.compile(r"^([A-ZÀ-Ö][a-zà-öù]+):\s+(.+)", re.DOTALL)
HEADER_KEYS = {"Meeting", "Date", "Attendees"}


def parse_utterances(text: str) -> list[tuple[str, str]]:
    """Return [(speaker, text), ...] from a transcript."""
    utterances = []
    current_speaker: str | None = None
    current_lines: list[str] = []

    for paragraph in re.split(r"\n{2,}", text.strip()):
        paragraph = paragraph.strip()
        if not paragraph:
            continue
        m = SPEAKER_RE.match(paragraph)
        if m and m.group(1) not in HEADER_KEYS:
            if current_speaker and current_lines:
                utterances.append((current_speaker, " ".join(current_lines)))
            current_speaker = m.group(1)
            current_lines = [m.group(2).replace("\n", " ")]
        elif current_speaker:
            current_lines.append(paragraph.replace("\n", " "))

    if current_speaker and current_lines:
        utterances.append((current_speaker, " ".join(current_lines)))

    return utterances


async def synthesize_to_file(text: str, voice: str, path: Path) -> None:
    for attempt in range(5):
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(str(path))
            return
        except Exception:
            if attempt == 4:
                raise
            await asyncio.sleep(2 ** attempt)


async def process_transcript(transcript: Path) -> None:
    output_path = AUDIO_DIR / transcript.with_suffix(".mp3").name
    if output_path.exists() and output_path.stat().st_size > 0:
        print(f"Skipping {transcript.name} (already exists)")
        return

    text = transcript.read_text(encoding="utf-8")
    utterances = parse_utterances(text)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        segment_paths: list[Path] = []

        for i, (speaker, utt_text) in enumerate(utterances):
            voice = SPEAKER_VOICES.get(speaker, DEFAULT_VOICE)
            seg_path = tmp / f"{i:04d}.mp3"
            await synthesize_to_file(utt_text, voice, seg_path)
            segment_paths.append(seg_path)

        # Build ffmpeg concat list with 0.4s silence between utterances
        silence_path = tmp / "silence.mp3"
        subprocess.run(
            ["ffmpeg", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono",
             "-t", "0.4", "-q:a", "9", str(silence_path)],
            check=True, capture_output=True,
        )

        concat_list = tmp / "list.txt"
        with concat_list.open("w") as f:
            for seg in segment_paths:
                f.write(f"file '{seg}'\n")
                f.write(f"file '{silence_path}'\n")

        subprocess.run(
            ["ffmpeg", "-f", "concat", "-safe", "0",
             "-i", str(concat_list), "-c", "copy", str(output_path)],
            check=True, capture_output=True,
        )
    print(f"Saved {output_path.name} ({len(utterances)} utterances)")


async def main() -> None:
    transcripts = sorted(TRANSCRIPTS_DIR.glob("*.txt"))
    for transcript in transcripts:
        print(f"Processing {transcript.name} ...")
        await process_transcript(transcript)
    print("Done.")


if __name__ == "__main__":
    asyncio.run(main())
