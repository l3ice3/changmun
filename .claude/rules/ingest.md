# rules/ingest.md — apps/ingest (Python, poetry)

> 수집·정규화·dedup·페르소나 부여 배치. 근거: `docs/data-model.md` §6/6-B/6-C/6-D, PRD FR-001·002.

## 구조
```
src/ingest/
  sources/      # kstartup.py, bizinfo.py, ontong_youth.py — 소스별 fetch+매핑 (1소스 1파일)
  normalize/    # enum 정규화(category 11종+기타), 날짜 split, region 매핑, HTML strip
  dedup/        # norm key → 블로킹 → 스코어링(0.85) → union-find → canonical
  persona/      # 3단계: 직접(K-Startup) → 상속(그룹) → 키워드 규칙 → NULL
  db.py         # UPSERT (ON CONFLICT (source, external_id))
  main.py       # 오케스트레이션: 소스 수집(격리) → dedup → 리포트
tests/          # pytest — fixture는 실제 API 응답 표본 사용
```

## 규칙
1. **소스별 수집 범위 고정**: K-Startup 전량 / 기업마당 `searchLclasId=06`만, **RSS(XML)로**(JSON 깨짐) / 온통청년 `mclsfNm=창업`만, JSON.
2. **소스 장애 격리**: 한 소스 실패가 다른 소스를 막으면 안 됨 (AC-004). 레코드 단위 오류는 스킵+로그 (AC-003).
3. **멱등성은 DB가 보장**: `(source, external_id)` UNIQUE + UPSERT. 코드에서 존재 확인 후 INSERT 같은 패턴 금지(레이스).
4. **미지 enum → '기타' + 원본 로그** (AC-005). 열린 enum 원칙 — 새 값에 crash 금지.
5. **dedup 임계 0.85는 상수로 분리**(튜닝 대상). 오합치 > 놓침 — 경계 케이스는 합치지 않는다 (AC-008).
6. **페르소나 키워드 규칙은 보수적으로** — 확실한 패턴만. 못 잡으면 NULL (AC-009). LLM 호출 금지(MVP).
7. 실행 결과 리포트 출력: 소스별 신규/갱신/스킵/미지값 건수 (DoD 항목).
8. 외부 호출은 timeout + 재시도 N회. API 키는 env로만.
