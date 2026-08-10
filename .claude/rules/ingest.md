---
paths:
  - "apps/ingest/**"
---

# rules/ingest.md — apps/ingest (Python, poetry)

> 수집·정규화·dedup·페르소나 부여 배치. 근거: `docs/data-model.md` §6/6-B/6-C/6-D/6-F, PRD FR-001·002·011.

## 구조
```
src/ingest/
  sources/      # kstartup.py, bizinfo.py, ontong_youth.py — 소스별 fetch+매핑 (1소스 1파일)
                # 민간(FR-011): asan_nanum.py, kakao_impact.py, sopoong.py, kb_innovation_hub.py
  normalize/    # enum 정규화(category 11종+기타), 날짜 split, region 매핑, HTML strip
  dedup/        # norm key → 블로킹 → 스코어링(0.85) → union-find → canonical
  persona/      # 3단계: 직접(K-Startup) → 상속(그룹) → 키워드 규칙 → NULL
  review.py     # 민간 검수 CLI(FR-011): pending 목록 → 승인/반려 + 페르소나 태깅 (관리자 웹 UI 금지)
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
7. 실행 결과 리포트 출력: 소스별 신규/갱신/스킵/미지값 건수 (DoD 항목). **민간 소스는 추가로 파싱 0건 시 "파손 의심" 경고 + pending 잔량** (AC-043).
8. 외부 호출은 timeout + 재시도 N회. API 키는 env로만.
9. **민간 소스(FR-011)는 화이트리스트만**(data-model 소스 레지스트리 — 신규 편입은 체크리스트+3인 합의). 기술은 **Tier 1만**: requests+BeautifulSoup4+feedparser — 헤드리스 브라우저·차단 우회 절대 금지. `review_status='pending'` 적재(**NULL 금지 — CHECK 제약이 민간 source의 NULL을 거부한다**, §6-F 규칙 2), **본문 전문 미수집**(사실 필드+원문 URL만 — §6-F). 재수집 UPSERT는 `rejected`·`pending` 불변, **`approved`는 핵심 필드(마감일·모집시작일·제목·금액 표기) 변경 시 `pending`으로 강등**(AC-041·044). 적재는 `is_canonical=false` — 승인 CLI가 한 트랜잭션에서 dedup·canonical·approved를 함께 확정한다(§6-F 규칙 8). 수동 등록도 **enum에 편입된 source만**(`ck_opportunity_source`가 7종 외 값을 거부 — 오타 포함). **승인·반려 UPDATE 둘 다** `WHERE updated_at = :seen_at AND review_status = 'pending'` + `SET ... updated_at = now()`(0행이면 재검수 — §6-F 규칙 8). 두 조건이 각각 배치 경합·검수자 간 경합을 막고, `updated_at`은 자동 갱신 트리거가 없어 **판정이 직접 올리지 않으면 가드가 무력**하다. 반려는 불변이라 못 본 내용이 영구 반려로 굳는다. 강등 시 그 행이 canonical이었으면 같은 트랜잭션에서 남은 멤버로 canonical 재선정(순서는 §6-D 규칙 5 — **노출 가능성이 출처보다 먼저**). 강등 판정은 **DB 컬럼이 아니라 `raw`의 직전 스냅샷과 비교**하되, 스냅샷에 **원문 사실 필드 + 상속 전 자체 파싱 결과**를 둘 다 넣는다. DB 컬럼 비교는 오탐(상속·태깅 때문에 매 배치 강등 루프), 원문만 비교는 누락(파서가 바뀌면 같은 원문에서 금액이 달라져도 못 잡음) — 둘 다 막아야 한다.
10. **크롤링 예절 의무**(AC-042): 매 실행 robots.txt 확인 → 불허면 요청 없이 스킵. UA `changmun-bot/1.0 (+https://changmun.com/bot)`. 요청 간 ≥1초. 403/429 → 즉시 해당 소스 중단+리포트(재시도·우회 금지).
