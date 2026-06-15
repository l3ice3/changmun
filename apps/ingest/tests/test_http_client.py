"""공통 HTTP 호출 — API 키 마스킹 검증 (절대규칙 6: 시크릿 로그 금지)."""
import pytest
import requests

from ingest.errors import SourceError
from ingest.sources import http_client


class FailingResponse:
    def __init__(self, status_code, text):
        self.status_code = status_code
        self.text = text

    def json(self):
        raise ValueError("not json")


class TestSecretRedaction:
    def test_request_exception_redacts_key(self):
        def raising_get(url, params, timeout):
            # requests 예외엔 실패한 요청 URL(=키 포함 쿼리)이 섞일 수 있다
            raise requests.ConnectionError(f"Max retries for {url}?serviceKey=SECRET123&page=1")

        with pytest.raises(SourceError) as exc_info:
            http_client.request_json(
                raising_get, "http://x", {"serviceKey": "SECRET123"}, sleep=lambda _: None)
        message = str(exc_info.value)
        assert "SECRET123" not in message
        assert "***" in message

    def test_http_error_body_redacts_key(self):
        def err_get(url, params, timeout):
            return FailingResponse(401, "invalid key apiKeyNm=KEY999")

        with pytest.raises(SourceError) as exc_info:
            http_client.request_json(
                err_get, "http://x", {"apiKeyNm": "KEY999"}, sleep=lambda _: None)
        assert "KEY999" not in str(exc_info.value)
