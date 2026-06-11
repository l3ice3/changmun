"""소스별 fetch+매핑 — 1소스 1파일 (kstartup.py / bizinfo.py / ontong_youth.py).

수집 범위 고정 (ingest.md 규칙 1):
- K-Startup: 전량, JSON (data-model.md §1·§6)
- 기업마당: searchLclasId=06만, RSS(XML) — JSON 깨짐 (§6-B)
- 온통청년: mclsfNm=창업만, JSON (§6-C)
"""
