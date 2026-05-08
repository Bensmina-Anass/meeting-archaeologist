from __future__ import annotations

import os

from google import genai
from google.genai import types

MODEL = "text-embedding-004"


def _make_client() -> genai.Client:
    return genai.Client(api_key=os.environ["GOOGLE_API_KEY"])


def embed_text(text: str) -> list[float]:
    response = _make_client().models.embed_content(
        model=MODEL,
        contents=text,
        config=types.EmbedContentConfig(task_type="SEMANTIC_SIMILARITY"),
    )
    return list(response.embeddings[0].values)
