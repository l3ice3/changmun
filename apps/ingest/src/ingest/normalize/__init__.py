"""정규화 — category 11종+기타, 날짜 split(YYYYMMDD), region 매핑, HTML strip.

규칙: data-model.md §6(정규화 15항)·§7(표준 분류). 미지 enum → '기타' + 원본 로그 (열린 enum).
"""
from ingest.normalize.taxonomy import (
    normalize_audiences,
    normalize_category,
    normalize_ontong_category,
    normalize_organization_type,
    normalize_region,
    normalize_stages,
    sido_from_zip_codes,
)
from ingest.normalize.text import (
    clean_text,
    clean_url,
    mentions_always_open,
    parse_yyyymmdd,
    split_date_range,
)

__all__ = [
    "clean_text",
    "clean_url",
    "mentions_always_open",
    "parse_yyyymmdd",
    "split_date_range",
    "normalize_audiences",
    "normalize_category",
    "normalize_ontong_category",
    "normalize_organization_type",
    "normalize_region",
    "normalize_stages",
    "sido_from_zip_codes",
]
