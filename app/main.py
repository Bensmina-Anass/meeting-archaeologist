from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.calendar import router as calendar_router
from app.api.routes.chat import router as chat_router
from app.api.routes.contradictions import router as contradictions_router
from app.api.routes.ingestion import router as ingestion_router
from app.api.routes.meetings import router as meetings_router
from app.api.routes.topics import router as topics_router

app = FastAPI(title="Meeting Archaeologist")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

app.include_router(ingestion_router)
app.include_router(topics_router)
app.include_router(meetings_router)
app.include_router(chat_router)
app.include_router(contradictions_router)
app.include_router(calendar_router)
