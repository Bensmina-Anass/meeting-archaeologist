from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path

from dotenv import load_dotenv

REPO_ROOT = Path(__file__).resolve().parent.parent
TRANSCRIPTS_DIR = REPO_ROOT / "data" / "transcripts"
AUDIO_DIR = REPO_ROOT / "data" / "audio"

# Runs at import time so env vars are available before any app module is loaded.
load_dotenv(REPO_ROOT / ".env")


@contextmanager
def db_session():
    from app.db import SessionLocal
    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()
