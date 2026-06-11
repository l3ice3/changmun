"""`python -m ingest` 진입점 (CLAUDE.md 명령어 계약). 종료 코드 0=성공 / 1=소스 실패 포함."""
import sys

from ingest.main import run

if __name__ == "__main__":
    sys.exit(run())
