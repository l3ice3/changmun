"""소스 공통 HTTP 호출 — timeout + 재시도 N회 (ingest.md 규칙 8). 소진 시 SourceError."""
import time
from collections.abc import Callable

import requests

from ingest.errors import SourceError

MAX_RETRIES = 3
TIMEOUT_SECONDS = 10


def request_json(
    http_get: Callable,
    url: str,
    params: dict,
    *,
    sleep: Callable[[float], None] = time.sleep,
    context: str = "",
) -> dict:
    last_error = "원인 미상"
    for attempt in range(MAX_RETRIES):
        if attempt > 0:
            sleep(2**attempt)
        try:
            response = http_get(url, params=params, timeout=TIMEOUT_SECONDS)
        except requests.RequestException as exc:
            last_error = f"요청 실패: {exc}"
            continue
        if response.status_code != 200:
            last_error = f"HTTP {response.status_code}: {response.text[:200]}"
            continue
        try:
            return response.json()
        except ValueError:
            # 인증 오류 등은 200 + XML 에러 봉투로 옴 → 본문 앞부분을 남겨 원인 추적
            last_error = f"JSON 파싱 실패: {response.text[:200]}"
    raise SourceError(f"{context} 수집 실패 ({MAX_RETRIES}회 재시도): {last_error}")
