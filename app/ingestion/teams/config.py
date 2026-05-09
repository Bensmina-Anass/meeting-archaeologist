from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

_REPO_ROOT = Path(__file__).resolve().parent.parent.parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    azure_tenant_id: str
    azure_client_id: str
    azure_client_secret: str
    teams_target_user_id: str
    ingestion_base_dir: Path = _REPO_ROOT / "data" / "transcripts" / "teams"
