"""스캐폴딩 스모크 테스트 — 패키지 구조가 import 가능한지만 확인."""
from ingest import db, dedup, main, normalize, persona, sources


def test_package_layout_importable():
    for module in (main, db, sources, normalize, dedup, persona):
        assert module.__doc__
