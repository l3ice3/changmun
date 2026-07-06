# changmun ingest 배치 이미지 (수집·정규화·dedup·페르소나, 일 1회 실행).
# 빌드 컨텍스트 = apps/ingest:
#   docker build -f apps/ingest/Dockerfile -t changmun-ingest apps/ingest
FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

# poetry로 의존성만 설치(프로젝트 자체는 PYTHONPATH로 실행 — src 레이아웃)
RUN pip install --no-cache-dir "poetry>=1.8"
COPY pyproject.toml poetry.lock ./
RUN poetry config virtualenvs.create false \
 && poetry install --only main --no-root

COPY src ./src
ENV PYTHONPATH=/app/src

# 환경변수(KSTARTUP_API_KEY·ONTONG_API_KEY·DATABASE_URL)는 실행 시 주입
ENTRYPOINT ["python", "-m", "ingest"]
