"""환경설정 — API 키·DB 접속은 환경변수로만 (CLAUDE.md 절대 규칙 / ingest.md 규칙 8).

apps/ingest/.env 파일이 있으면 로드한다 (.env.example 참조, 커밋 금지).
"""
import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# 로컬 docker compose 기본값 (apps/api application.yml과 동일 DB)
DEFAULT_DSN = "postgresql://changmun:changmun@localhost:5432/changmun"

_ENV_PATH = Path(__file__).resolve().parents[2] / ".env"


@dataclass(frozen=True)
class Settings:
    kstartup_api_key: str | None
    bizinfo_api_key: str | None
    ontong_api_key: str | None
    database_dsn: str


def load_settings() -> Settings:
    load_dotenv(_ENV_PATH)
    return Settings(
        kstartup_api_key=os.environ.get("KSTARTUP_API_KEY") or None,
        bizinfo_api_key=os.environ.get("BIZINFO_API_KEY") or None,
        ontong_api_key=os.environ.get("ONTONG_API_KEY") or None,
        database_dsn=os.environ.get("DATABASE_URL", DEFAULT_DSN),
    )
