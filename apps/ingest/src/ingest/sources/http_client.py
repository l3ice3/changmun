"""소스 공통 HTTP 호출 — timeout + 재시도 N회 (ingest.md 규칙 8). 소진 시 SourceError."""
import re
import time
from collections.abc import Callable
from urllib.parse import quote

import requests

from ingest.errors import SourceError

MAX_RETRIES = 3
TIMEOUT_SECONDS = 10

# API 키가 실리는 쿼리 파라미터명 — 예외·응답 메시지에서 값을 가린다 (절대규칙 6: 시크릿 로그 금지)
_SECRET_PARAM_NAMES = ("serviceKey", "apiKeyNm", "crtfcKey")
# 쿼리스트링의 키 파라미터를 값 인코딩(raw·percent-encoded)과 무관하게 통째로 마스킹
_SECRET_QUERY_PATTERN = re.compile(
    "(" + "|".join(_SECRET_PARAM_NAMES) + r")=[^&\s\"']+", re.IGNORECASE
)


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
            # 예외 문자열에 요청 URL(=키 포함 쿼리)이 섞일 수 있어 마스킹 후 저장
            last_error = _redact_secrets(f"요청 실패: {exc}", params)
            continue
        if response.status_code != 200:
            last_error = _redact_secrets(f"HTTP {response.status_code}: {response.text[:200]}", params)
            continue
        try:
            return response.json()
        except ValueError:
            # 인증 오류 등은 200 + XML 에러 봉투로 옴 → 본문 앞부분을 남겨 원인 추적
            last_error = _redact_secrets(f"JSON 파싱 실패: {response.text[:200]}", params)
    raise SourceError(f"{context} 수집 실패 ({MAX_RETRIES}회 재시도): {last_error}")


def _redact_secrets(message: str, params: dict) -> str:
    # 1차: 쿼리스트링의 키 파라미터를 통째로 마스킹 (requests가 키를 percent-encode해도 잡힘)
    redacted = _SECRET_QUERY_PATTERN.sub(r"\1=***", message)
    # 2차: 쿼리 밖에 값만 노출된 경우 대비 — 실제 키 값을 raw·encoded 양쪽으로 치환
    for name in _SECRET_PARAM_NAMES:
        secret = params.get(name)
        if secret:
            secret = str(secret)
            redacted = redacted.replace(secret, "***").replace(quote(secret, safe=""), "***")
    return redacted
