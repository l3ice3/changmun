"""텍스트·날짜·URL 정제 — data-model.md §6 규칙 2(날짜)·4(HTML 언이스케이프)·5(공백)·11(URL)."""
import html
import re
from datetime import date

# 마크다운 래핑 [표시텍스트](실제URL) → 실제URL 추출 (§6 규칙 11)
_MARKDOWN_LINK = re.compile(r"\[[^\]]*\]\(([^)]+)\)")
# 스킴 없는 도메인 형태 (예: www.k-startup.go.kr/...) — 한글·공백 포함 시 URL 아님
_BARE_DOMAIN = re.compile(r"^[\w-]+(\.[\w-]+)+(/\S*)?$")
_YYYYMMDD = re.compile(r"^\d{8}$")


def clean_text(value: str | None) -> str | None:
    """HTML 엔티티 디코딩(&amp; 등) + \\r\\n 정리 + 앞뒤 공백 제거. 빈 결과는 None."""
    if value is None:
        return None
    cleaned = html.unescape(str(value)).replace("\r\n", "\n").strip()
    return cleaned or None


def parse_yyyymmdd(value: str | int | None) -> date | None:
    """라이브 형식 YYYYMMDD(8자리) → date. 형식 이탈은 None (raw에 원본 보존됨)."""
    if value is None:
        return None
    text = str(value).strip()
    if not _YYYYMMDD.match(text):
        return None
    try:
        return date(int(text[:4]), int(text[4:6]), int(text[6:8]))
    except ValueError:
        return None


def clean_url(value: str | None) -> str | None:
    """URL 정제 (§6 규칙 11): 마크다운 래핑 해제 → 엔티티 디코딩 → 스킴 보정.

    URL 형태가 아니면(한글 안내문 등) None — apply_url 폴백 체인의 "URL일 때" 판정을 겸한다.
    """
    if value is None:
        return None
    text = html.unescape(str(value)).strip()
    markdown = _MARKDOWN_LINK.match(text)
    if markdown:
        text = markdown.group(1).strip()
    if text.startswith(("http://", "https://")):
        return text
    if _BARE_DOMAIN.match(text):
        return f"https://{text}"
    return None
