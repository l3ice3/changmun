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
9. **민간 소스(FR-011)** — 계약은 data-model **§6-F(v2 스키마 전제)**이며, v2 이관(§2-D) 뒤에 구현한다. 화이트리스트만(소스 레지스트리 — 신규 편입은 체크리스트+3인 합의). 기술은 **Tier 1만**: requests+BeautifulSoup4+feedparser — 헤드리스 브라우저·차단 우회 절대 금지. **본문 전문 미수집**(사실 필드+원문 URL만).
   - **적재**: `source_record`에 `review_status='pending'`. `DEFAULT`가 없어 **상태를 빠뜨리면 INSERT가 실패한다**(fail-closed). 미편입·오타 `source_code`는 `source_registry` FK가 거부한다.
   - **재수집 UPSERT**: `rejected`·`pending`·`not_required` 불변, **`approved`도 불변** — 재수집은 내용만 갱신하고 `review_status`를 SET 목록에 넣지 않는다(새로 읽은 값이 더 정확하다). **상태를 바꾸는 건 사람뿐**: 검수 판정 + 검수자의 재검수 지정(`approved`→`pending`). 제목 전면 변경은 **리포트 경고**만, `eligibility_detail` 변경은 **그 실체의 `manual_*` 초기화 → 태깅 큐** (§6-F 규칙 4). **`raw` 스냅샷을 따로 두지 말 것** — 비교할 상태 전이 자체가 없다.
   - **`opportunity`(실체)는 병합 배치만 쓴다.** **멤버의 노출 자격이나 병합 입력을 바꾸는 동작은 같은 트랜잭션에서 그 그룹을 재병합한다**(§2-C 불변식 5 — 승인·재검수 지정·자격문구 태그 초기화). **재병합만으로는 부족한 경우가 있다** — `manual_*`는 노출 자격과 무관하게 합쳐지므로, 그 실체에 `approved` 민간 멤버가 하나도 남지 않으면 태그도 함께 비운다(불변식 6). **태깅 큐의 술어도 같아야 한다** — `approved` 민간 멤버가 있는 실체 중 `manual_tagged_at IS NULL`. `is_visible`로 잡으면 방금 비운 걸 곧바로 다시 채운다(§6-F 규칙 10). 물리 테이블이라 재병합 전까지 서빙이 안 바뀐다. 재병합하면 대표(`representative_record_id`)와 `is_visible`이 같이 확정된다 — 대표 재선정 순서는 §6-D 규칙 5(**노출 가능성이 출처보다 먼저**).
   - **수동 태깅은 `opportunity.manual_target_*`에만.** 병합 UPSERT의 `DO UPDATE SET` 목록에서 이 컬럼들을 **빼라** — 넣으면 민간 멤버의 `target_*`가 항상 NULL이라 다음 배치가 태그를 지운다(§6-F 규칙 9, AC-041). `source_record`에 쓰는 것도 금지(계층 경계 — 매 배치 UPSERT가 덮어쓴다).
   - **판정 UPDATE(승인·반려·재검수 지정 전부)**: `SET review_status = :verdict, updated_at = now()` + `WHERE updated_at = :seen_at AND review_status = :expected_status`(승인·반려는 `'pending'`, 재검수 지정은 `'approved'`). 0행이면 취소·재확인. 두 조건이 각각 *배치와의* / *다른 검수자와의* 경합을 막고, 자동 갱신 트리거가 없어 **판정이 `updated_at`을 직접 올리지 않으면 가드가 무력**하다. 반려는 불변이라 못 본 내용이 영구 반려로 굳는다.
   - 수동 등록도 **registry에 편입된 source만**(§6-F 규칙 11).
10. **크롤링 예절 의무**(AC-042): 매 실행 robots.txt 확인 → 불허면 요청 없이 스킵. UA `changmun-bot/1.0 (+https://changmun.com/bot)`. 요청 간 ≥1초. 403/429 → 즉시 해당 소스 중단+리포트(재시도·우회 금지).
