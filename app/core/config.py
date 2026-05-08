from __future__ import annotations

import os

GOOGLE_API_KEY: str = os.environ["GOOGLE_API_KEY"]
DATABASE_URL: str = os.environ["DATABASE_URL"]
TOPIC_SIMILARITY_THRESHOLD: float = float(os.getenv("TOPIC_SIMILARITY_THRESHOLD", "0.85"))
