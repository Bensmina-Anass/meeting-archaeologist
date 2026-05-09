"""pytest configuration — sets stub env vars so app.core.config can be imported
without a real .env file during unit/integration tests.  All actual API calls
are mocked at the test level, so these values are never sent over the wire.
"""
from __future__ import annotations

import os

# Must be set before any app.* module is imported.
os.environ.setdefault("GOOGLE_API_KEY", "test-key")
os.environ.setdefault("DATABASE_URL", "postgresql://test:test@localhost/test")
os.environ.setdefault("TOPIC_SIMILARITY_THRESHOLD", "0.85")
