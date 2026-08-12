# AC (Acceptance Criteria) — 창업 지원금 큐레이션 서비스

> 연결 PRD: `PRD.md` v0.1. 모든 AC는 FR과 매핑되며, Pass/Fail 즉시 판정 가능해야 한다.
> **검증 전략(확정): 수집·dedup·API = 자동 테스트 / 프론트 UI = 수동 절차.**

---

## 0. 문서 정보

| 항목 | 내용 |
|---|---|
| 프로젝트명 | 미정 (가칭 "지원금 전담 비서") |
| 연결 PRD | `PRD.md` (v0.1) |
| 작성일 | 2026-06-10 |
| 상태 | Draft |
| 테스트 전략 | **확정** — Python(수집·dedup)=pytest 필수 / Spring(API)=슬라이스 테스트 필수 / 프론트=수동 확인 절차 (MVP. E2E 자동화는 Phase 2 이후 검토) |

---

## 1. FR ↔ AC 매핑 테이블

| FR ID | 기능명 | 연결 AC | 상태 |
|---|---|---|---|
| FR-001 | 공고 수집 파이프라인 | AC-001 ~ AC-005 | 구현 — 3소스 전부 라이브 검증: K-Startup(2026-06-11, 29,046건)·온통청년(2026-06-12, 322건)·**기업마당(2026-07-15, 80건·신규11·스킵0·미지값0)**. AC-001~005 Pass. 기업마당 라이브 이슈 2건 반영(hashtags 소문자·날짜 대시 형식 — data-model §6-B 주석) |
| FR-002 | dedup & 페르소나 부여 | AC-006 ~ AC-010 | 구현 — AC-006~010 자동 테스트 Pass(실DB 통합 포함). 라이브(2026-06-12): 29,383건 → 19그룹, **전수 검수 오합치 0**(경계 1건 기록). 임계 0.85 + 실질 토큰 차이 거부 튜닝(PRD §11-8). **교차 소스 튜닝(2026-07-16, §11-8 재수행)**: 기관 후보 집합(소관·수행)+법인격 접두 정규화+시작일 ±1일+전국 표현 특례 — bizinfo↔K-Startup 4그룹 신규 병합, **전수 검수 오합치 0**, **AC-007 상속 라이브 첫 발동(4건)** |
| FR-003 | 페르소나 필터 리스트 | AC-011 ~ AC-014 | 구현 — 도메인 산식 단위 + 리포지토리 슬라이스(Testcontainers) + 리스트 API E2E(MockMvc) 자동 테스트 Pass. AC-011·012·013·014·CC-05 충족. 화면 배치는 S3 공고 탐색으로 이동(2026-07-04 직행식 IA, PRD FR-003 주석) |
| FR-004 | 공고 상세 + 용어풀이 | AC-015 ~ AC-018 | 구현 — 상세 API + glossary 매칭(단위) + 상세/용어 E2E(MockMvc) Pass. AC-015·016·017·018 충족. glossary 스타터 시드(V20260616_1600) |
| FR-005 | 키워드 검색 | AC-019 ~ AC-021 | 구현(서버) — q(title+summary pg_trgm ILIKE)·2글자 미만 400·메타문자 바인딩 안전 + LIKE 와일드카드(%·_) 이스케이프(Codex #17). AC-019·020·021 Pass(슬라이스+E2E). 검색 UI는 프론트 |
| FR-006 | 찜(익명·로컬) | AC-022 ~ AC-024 | 구현(서버) — ids= 순서보존·없는 id 누락·canonical 무관. AC-023·024 Pass(슬라이스), 엔드포인트 라우팅 E2E. localStorage·AC-022 UI는 프론트 |
| FR-007 | 행동 로그 | AC-025 ~ AC-027 | 구현(서버) — POST /events 202, eventType·payload 키 화이트리스트(PII 차단). AC-025·027 Pass(단위+E2E). AC-026(fire-and-forget)는 프론트 |
| FR-008 | 지원금 규모 추출 (데이터) | AC-028 ~ AC-030 | 구현(데이터) — AC-028~030 Pass(파서 단위 22케이스 + 실DB 상속·멱등 통합). **라이브 검수 반복(오추출 5유형→규칙 승격) 후 149건 채움**(K-Startup 88·온통청년 41·기업마당 20 — 후처리 재산출이 기존 행 본문도 커버, 원 생략형 포함 149건). 최신 공고 전수 + K-Startup 상위 표본 검수 오추출 0. 서빙·표시는 FR-009 |
| FR-009 | 지원금 필터·서빙 노출 | AC-031 ~ AC-033 | 구현 — `hasAmount`·`minAmount` 필터 + `maxSupportAmount`·`supportAmount` 리스트 노출 + 카드 금액 표시·필터 드롭다운(web). AC-031(슬라이스 3케이스: 유무·하한·페르소나 조합)·AC-032(E2E 직렬화 non-null/null)·AC-033(파싱 단위 4케이스 + E2E 400) Pass. web 수동 절차는 AC-032 검증란. 확장 예약(maxAmount)은 api-spec §1 명시. 총예산 원문만 잡힌 공고(max NULL)는 두 필드 null 서빙 — 카드 총예산 오노출 방지(Codex #69 반영, E2E 케이스 추가) |
| FR-010 | 쇼케이스 (창업자 제품 홍보) | AC-034 ~ AC-038 | 구현 — 선검수 후게시·리스트/상세·응원·댓글·주간 모아보기. AC-034~037 자동 테스트 Pass(슬라이스 6케이스 + E2E 8케이스, 실 PostgreSQL). AC-038(웹 화면)은 수동 절차 Pass(2026-08-01 로컬 검증: 리스트·상세·404·로그인 게이트·홈 주간 섹션). 검수는 DB 수동(data-model §8-B) |
| FR-011 | 민간 공고 수집 (하이브리드) | AC-039 ~ AC-044 | **문서 확정(2026-07-26, 팀 3인 합의) — 구현 대기.** 파일럿 4소스(asan-nanum·kakao-impact·sopoong·kb-innovation-hub), Tier 1 기술 한정, `review_status` 검수 게이트(적재는 pending, 상태 전이는 사람만 — 집합의 단일 진실은 data-model §6-F 규칙 4). 소스 실사 이력은 data-model 소스 레지스트리. **번호 재배정(2026-08-10)**: 원안은 FR-010/AC-034~039였으나 쇼케이스가 먼저 머지돼 같은 번호를 점유 → FR-011/AC-039~044로 이관. **AC-039~044는 data-model v2 저장 계층(§2, 3인 합의 대상)을 전제로 기술** — v2 미합의 시 v1 컬럼 기준으로 되돌려야 한다 |

> **프론트(S1~S4) 구현 완료** — 위 표의 '…는 프론트' 항목(FR-003~007의 검색 UI·찜 localStorage(AC-022)·로깅 fire-and-forget(AC-026) 등)은 web 앱에 구현됨(프론트는 수동 AC 절차 기준 판정).
> **FR-001~007 이후 추가 개선**(별도 AC 없음 — 스코프 확장 승인): 홈 지표 `GET /opportunities/stats` · 출처 `source` 필터 + 출처별 둘러보기 · 다크(나이트) 모드 · 검색 팝업 · 직행식 카드.

---

## 2. Acceptance Criteria

### FR-001: 공고 수집 파이프라인

#### AC-001: 3개 소스가 정해진 범위로 수집·매핑된다 (Happy / Must)
```gherkin
Given: 빈 opportunity 테이블 + 유효한 API 키 3종
When:  수집 스크립트를 1회 실행한다
Then:  source별('k-startup','bizinfo','ontong-youth') 레코드가 각 1건 이상 적재되고,
       bizinfo 레코드는 전부 창업 분야(searchLclasId=06 수집분)이며,
       ontong-youth 레코드는 전부 mclsfNm=창업 슬라이스이고,
       모든 레코드에 external_id·title·source·raw가 NOT NULL이다
```
**검증**
- [ ] 자동: `apps/ingest/tests/test_pipeline.py` — 소스별 count>0, 필수필드 NOT NULL 검증
- [ ] SQL: `SELECT source, COUNT(*) FROM opportunity GROUP BY source;` + 표본 5건 raw 대조

#### AC-002: 재실행해도 중복 행이 생기지 않는다 — 멱등성 (Edge / Must)
```gherkin
Given: 수집 1회 완료된 DB (행 수 = N)
When:  같은 스크립트를 즉시 1회 더 실행한다
Then:  행 수는 그대로 N이고(신규 공고 없다고 가정), 기존 행의 updated_at만 갱신된다(first_seen_at 불변)
```
**검증**
- [ ] 자동: `test_idempotency` — 2회 실행 전후 `COUNT(*)` 동일 + `updated_at` 변경 확인

#### AC-003: 필수필드 누락 레코드는 스킵되고 파이프라인은 계속된다 (Negative / Must)
```gherkin
Given: external_id 또는 title이 없는 레코드가 섞인 API 응답 fixture
When:  수집을 실행한다
Then:  해당 레코드는 DB에 적재되지 않고, 스킵 로그(소스·사유 포함)가 남으며,
       나머지 정상 레코드는 전부 적재된다(파이프라인 중단 없음)
```
**검증**
- [ ] 자동: `test_skip_invalid` — fixture 투입 → 정상 건수만 적재 + 로그 항목 assert

#### AC-004: 한 소스 장애가 다른 소스 수집을 막지 않는다 (Negative / Must)
```gherkin
Given: 기업마당 API 키만 무효(또는 엔드포인트 불통)인 상태
When:  수집을 실행한다
Then:  k-startup·ontong-youth는 정상 적재되고, bizinfo는 실패 로그(소스 단위)가 남으며,
       프로세스 종료 코드는 부분 실패를 나타낸다(전체 crash 금지)
```
**검증**
- [ ] 자동: `test_source_isolation` — mock 1개 소스 실패 → 나머지 적재 assert

#### AC-005: 미지의 enum 값은 '기타'로 적재되고 원본은 보존된다 (Edge / Must)
```gherkin
Given: category(supt_biz_clsfc 등)에 표준 11종 밖의 새 값이 담긴 fixture
When:  수집을 실행한다
Then:  category='기타'로 적재되고, raw에 원본값이 그대로 보존되며, 미지값 로그가 남는다
```
**검증**
- [ ] 자동: `test_unknown_enum` — fixture → category·raw·로그 assert

---

### FR-002: dedup & 페르소나 부여

#### AC-006: 동일 공고는 한 그룹으로 묶이고 canonical은 1건이다 (Happy / Must)
```gherkin
Given: 같은 사업(제목 유사도 높음 + 기관 동일 + 마감 동일)이 k-startup·bizinfo에 각 1건 있는 fixture
When:  dedup 배치를 실행한다
Then:  두 레코드의 dedup_group_id가 같고, is_canonical=true는 K-Startup 레코드 1건뿐이다
```
**검증**
- [ ] 자동: `apps/ingest/tests/test_dedup.py::test_merge_pair` — 그룹 ID 동일 + canonical 단일 assert
- [ ] SQL: `SELECT dedup_group_id, COUNT(*) FILTER (WHERE is_canonical) FROM opportunity GROUP BY 1;` → 그룹당 canonical=1

#### AC-007: 그룹에 묶인 기업마당 공고는 페르소나를 상속받는다 (Happy / Must)
```gherkin
Given: AC-006의 그룹 (K-Startup판 target_startup_stage=['PRE_STARTUP'])
When:  페르소나 부여 단계가 실행된다
Then:  같은 그룹의 bizinfo 레코드도 target_startup_stage에 'PRE_STARTUP'을 가지며,
       페르소나 탭(예비) 쿼리에 양쪽 모두 잡힌다(서빙은 canonical 1건만 노출)
```
**검증**
- [ ] 자동: `test_persona_inherit` — 그룹 내 target_* 일치 assert

#### AC-008: 비슷하지만 다른 공고는 합쳐지지 않는다 — 오합치 금지 (Negative / Must)
```gherkin
Given: 제목은 유사하나 차수·기간이 다른 공고 쌍 fixture(예: "1차 모집" vs "2차 모집", 마감 상이 → 스코어 < 0.85)
When:  dedup 배치를 실행한다
Then:  두 레코드의 dedup_group_id가 다르거나 둘 다 NULL이다(병합 안 됨)
```
**검증**
- [ ] 자동: `test_no_false_merge` — 경계 fixture 쌍 미병합 assert
- [ ] 수동(출시 게이트): 실데이터 dedup 결과에서 그룹 표본 50쌍 추출 → 눈 검수 → **오합치 0건** (PRD Goal 3)

#### AC-009: 페르소나 신호가 없으면 NULL을 유지한다 — 억지 채움 금지 (Edge / Must)
```gherkin
Given: 그룹에 속하지 않고 trgetNm·제목에 키워드 신호도 없는 bizinfo 단독 레코드
When:  페르소나 부여 단계가 실행된다
Then:  target_startup_stage·target_audience_type 모두 NULL이고,
       이 공고는 persona 필터 쿼리에 잡히지 않으며 지원 대상 미지정(전체) 조회에서 "조건 미상" 표기로 노출된다
```
**검증**
- [ ] 자동: `test_persona_unknown` — NULL 유지 assert
- [ ] 수동: 지원 대상 미지정(전체) 조회에서 해당 카드에 "조건 미상" 표기 확인

#### AC-010: canonical이 마감되면 진행 중 레코드로 승격된다 (Edge / Must)
```gherkin
Given: 그룹 내 canonical(K-Startup)은 마감일 경과, bizinfo판은 아직 진행 중
When:  다음 dedup 배치가 실행된다
Then:  진행 중인 bizinfo 레코드가 is_canonical=true가 되고, 마감 레코드는 false가 된다
```
**검증**
- [ ] 자동: `test_canonical_repromote` — 날짜 fixture로 승격 assert

---

### FR-003: 페르소나 필터 리스트

#### AC-011: 페르소나 탭이 정확한 쿼리 결과를 반환한다 (Happy / Must)
```gherkin
Given: target_startup_stage에 PRE_STARTUP 포함 공고 3건 + 미포함 공고 3건 + 비-canonical 1건 (전부 진행 중)
When:  GET /api/v1/opportunities?persona=PRE_STARTUP 을 호출한다
Then:  200 응답, 항목은 정확히 3건(PRE_STARTUP 포함 + canonical만),
       정렬은 application_deadline ASC, 상시(deadline NULL)는 맨 뒤다
```
**검증**
- [ ] 자동: Spring `OpportunityControllerTest#personaFilter` — 건수·정렬 assert
- [ ] API: `curl '/api/v1/opportunities?persona=PRE_STARTUP'` → SQL 결과와 교차 대조

#### AC-012: 결과 0건이면 빈 배열 + 빈 상태 UI다 (Edge / Must)
```gherkin
Given: 조건에 맞는 공고가 없는 필터 조합(예: persona=UNIV_STUDENT & region=세종)
When:  리스트를 조회한다
Then:  API는 200 + items=[] (에러 아님), 화면은 "조건에 맞는 공고가 없어요" + "전체 공고 보기"(필터 초기화) 버튼을 보여준다
```
**검증**
- [ ] 자동: `#emptyResult` — 200 + 빈 배열 assert
- [ ] 수동: 브라우저에서 해당 조합 → 빈 상태 화면 확인

#### AC-013: status·D-day·배지는 서버 응답에 계산돼 있다 (Happy / Must)
```gherkin
Given: 마감일 = 오늘+3일인 공고 1건 (target_startup_stage=['PRE_STARTUP'])
When:  리스트/상세를 조회한다
Then:  응답 JSON에 status="OPEN", dDay=3, closingSoon=true(≤7),
       badges에 "NO_BIZ_REQUIRED"(라벨: 사업자 불필요)가 포함된다 — 프론트는 이 값을 그대로 렌더링한다(재계산 금지)
```
**검증**
- [ ] 자동: `#computedFields` — 날짜 fixture 기준 status/dDay/badges assert
- [ ] 코드 리뷰: 프론트에 deadline 기반 날짜 연산 로직이 없는지 확인

#### AC-014: 잘못된 파라미터는 400, 범위 초과 페이지는 빈 배열이다 (Negative / Must)
```gherkin
Given: 서비스 정상 동작 중
When:  GET /api/v1/opportunities?persona=INVALID_VALUE 를 호출한다
Then:  400 + 에러 코드/메시지 JSON. (단, page=9999는 200 + items=[] — 에러 아님)
```
**검증**
- [ ] 자동: `#invalidParams` — 400 / 범위 초과 200 빈 배열 assert

---

### FR-004: 공고 상세 + 용어풀이

#### AC-015: 상세는 필수 정보와 용어풀이를 함께 보여준다 (Happy / Must)
```gherkin
Given: summary에 glossary 등재 용어("사업화자금")가 포함된 공고
When:  상세 페이지에 진입한다
Then:  제목·기관·기간(D-day)·자격·지원내용·원문 링크가 표시되고,
       "사업화자금"이 하이라이트되며 탭 시 쉬운 설명이 노출되고,
       자격 영역 카피는 "신청 자격이 됩니다"형이다("받을 수 있어요" 문구 부재)
```
**검증**
- [ ] API: `GET /api/v1/opportunities/{id}` → 필드 + matchedTerms 포함 assert
- [ ] 수동: 브라우저에서 1) 상세 진입 2) 용어 탭 3) 카피 문구 확인 (금지 문구 grep: 프론트 코드에서 "받을 수 있")

#### AC-016: 존재하지 않는 id는 404 전용 페이지다 (Negative / Must)
```gherkin
Given: DB에 없는 id=999999999
When:  /opportunities/999999999 에 접근한다
Then:  API는 404 JSON, 페이지는 전용 404 화면(빈 화면·무한로딩 금지)을 보여준다
```
**검증**
- [ ] 자동: `#notFound` — 404 assert / 수동: URL 직접 접근 확인

#### AC-017: apply_url이 없으면 원문 버튼만 노출된다 (Edge / Must)
```gherkin
Given: apply_url이 NULL이고 detail_url만 있는 공고
When:  상세 페이지를 본다
Then:  "공고 원문 보기" 버튼 1개만 보이고, 빈 신청 버튼·깨진 링크는 없다
```
**검증**
- [ ] 수동: 해당 공고 상세에서 버튼 구성 확인

#### AC-018: 마감된 공고도 페이지는 열리고 마감 표기가 붙는다 (Edge / Must)
```gherkin
Given: 마감일이 지난 공고 (검색엔진 유입 가정)
When:  상세 URL로 직접 접근한다
Then:  404가 아니라 정상 렌더링되며, "마감된 공고" 표기가 본문 상단에 보인다
```
**검증**
- [ ] 자동: `#closedDetail` — 200 + status="CLOSED" assert / 수동: 표기 확인

---

### FR-005: 키워드 검색

#### AC-019: 부분일치 검색이 동작한다 (Happy / Should)
```gherkin
Given: title에 "청년창업사관학교"가 포함된 공고 존재
When:  GET /api/v1/opportunities?q=창업사관 을 호출한다
Then:  해당 공고가 결과에 포함된다(pg_trgm 부분일치)
```
**검증**
- [ ] 자동: `#searchPartialMatch` — 부분 문자열로 hit assert

#### AC-020: 1글자 검색은 실행되지 않고 안내한다 (Edge / Should)
```gherkin
Given: 검색창에 "창" 1글자 입력
When:  검색을 시도한다
Then:  요청이 발생하지 않거나 400이며, "2글자 이상 입력해주세요" 안내가 보인다
```
**검증**
- [ ] 수동: 브라우저 검색창 + 네트워크 탭 확인 / 자동: 400 assert

#### AC-021: 특수문자·SQL 메타문자가 안전하게 처리된다 (Negative / Must)
```gherkin
Given: 서비스 정상 동작 중
When:  q='; DROP TABLE opportunity;-- 와 %, _ 등 메타문자로 검색한다
Then:  500 없이 200(결과 0건 가능)이고, DB 스키마·데이터에 변화가 없다
```
**검증**
- [ ] 자동: `#searchInjectionSafe` — 메타문자 입력 → 200 + 테이블 무결성 assert

---

### FR-006: 찜 (익명·로컬)

#### AC-022: 찜이 로컬에 저장되고 목록에서 조회된다 (Happy / Should)
```gherkin
Given: 공고 카드 A를 보고 있는 비로그인 사용자
When:  찜 버튼을 누르고 찜 목록 화면으로 이동한다
Then:  localStorage에 A의 id가 저장돼 있고, 찜 목록에 A 카드가 표시된다(GET ?ids= 사용)
```
**검증**
- [ ] 수동: 브라우저 1) 찜 클릭 2) devtools localStorage 확인 3) 찜 목록 확인

#### AC-023: ids에 없는 id가 섞여도 있는 것만 반환된다 (Edge / Should)
```gherkin
Given: 유효 id 2개 + DB에 없는 id 1개
When:  GET /api/v1/opportunities?ids=a,b,없는것 을 호출한다
Then:  200 + 유효 2건만 반환(에러·NULL 항목 없음)
```
**검증**
- [ ] 자동: `#idsPartialMissing` — 2건 반환 assert

#### AC-024: 찜한 공고가 마감돼도 목록에서 사라지지 않는다 (Edge / Should)
```gherkin
Given: 찜해둔 공고의 마감일이 지났다
When:  찜 목록을 다시 연다
Then:  해당 카드가 여전히 보이되 "마감" 표기가 붙어 있다(말없이 사라지지 않음)
```
**검증**
- [ ] 수동: 날짜 지난 fixture 공고 찜 → 목록 표기 확인

---

### FR-007: 행동 로그

#### AC-025: 핵심 이벤트가 익명 ID와 함께 적재된다 (Happy / Must)
```gherkin
Given: 첫 방문 사용자(익명 클라이언트 UUID 발급됨)
When:  리스트 조회 → 상세 진입 → 원문 클릭을 수행한다
Then:  event_log에 list_view·detail_view·outbound_click 3행이 같은 client_id로 적재되고,
       payload(JSONB)에 탭/필터·opportunity_id가 담겨 있다
```
**검증**
- [ ] 수동+SQL: 브라우저 행동 후 `SELECT event_type, client_id, payload FROM event_log ORDER BY created_at DESC LIMIT 5;`

#### AC-026: 로깅 실패가 사용자 행동을 막지 않는다 (Negative / Must)
```gherkin
Given: /api/v1/events 엔드포인트가 차단된 상태(네트워크 블록)
When:  사용자가 원문 링크를 클릭한다
Then:  원문 페이지로 정상 이동하며, 에러 토스트·지연·차단이 없다(fire-and-forget)
```
**검증**
- [ ] 수동: devtools에서 /api/v1/events 차단 → 클릭 동작 확인

#### AC-027: 행동 로그(event_log)에 개인정보가 저장되지 않는다 (Negative / Must)
```gherkin
Given: 운영 중 적재된 event_log 표본 100행
When:  payload·전체 컬럼을 점검한다
Then:  이메일·이름·전화번호 등 PII 필드가 존재하지 않는다(익명 UUID·행동 데이터만)
```
> 범위: **event_log·비로그인 경로 한정**. 로그인 `app_user`의 최소 PII(이메일·provider)는 data-model §8로 별도 관리(개인정보처리방침 대상).
**검증**
- [ ] 자동: 이벤트 스키마 화이트리스트 검증(허용 키 외 거부) / SQL 표본 점검

---

### FR-008: 지원금 규모 추출 (데이터 파트)

#### AC-028: 확실한 지원금 표현이 두 컬럼으로 정확히 추출된다 (Happy / Must)
```gherkin
Given: 본문에 "기업당 최대 1.5억원 지원 (총 사업비 100억원)"이 있는 공고
When:  수집 배치를 실행한다
Then:  max_support_amount = 150000000, total_program_budget = 10000000000 (원 단위 정수)이고,
       원문 표기가 support_amount(TEXT)에 보존된다
```
**검증**
- [ ] 자동: `apps/ingest/tests/test_amounts.py` — 수식어(기업당·팀당·1인당·최대 / 총 사업비·총 예산)별 컬럼 구분, 단위 조합(억·천만·백만·소수점·콤마) 변환
- [ ] SQL: 라이브 표본 대조 — 추출된 값과 본문 원문 비교

#### AC-029: 자격 조건·융자 한도 금액을 지원금으로 오인하지 않는다 (Negative / Must)
```gherkin
Given: 본문에 "연 매출액 10억원 이하 기업"·"1천만원 이상 투자 유치 기업"·"보증한도 20억원"만 있는 공고
When:  수집 배치를 실행한다
Then:  max_support_amount·total_program_budget 모두 NULL이다 (오추출 = 오정보 — 미추출보다 나쁨)
```
**검증**
- [ ] 자동: 자격 문맥(이하·이상·미만·매출·투자 유치)·융자 문맥(보증·융자·대출 한도) 제외 케이스 테스트
- [ ] 수동: 라이브 추출 결과 전수 검수(채움 건이 소수라 가능) — 오추출 0건

#### AC-030: 신호 없으면 NULL, 재실행 멱등, dedup 그룹 상속 (Edge / Must)
```gherkin
Given: 금액 표현이 없는 공고 + 같은 dedup 그룹에 금액이 추출된 타 출처 공고가 있는 상태
When:  배치를 2회 연속 실행한다
Then:  금액 없는 공고는 자체 추출 NULL이지만 그룹 상속으로 금액을 공유하고,
       2회 실행 결과가 1회와 동일하다(행 수·값 불변)
```
**검증**
- [ ] 자동: 상속 단계 테스트(페르소나 상속과 동일 패턴) + 멱등 재실행 테스트
> 마케팅 사용 전제(PRD FR-008 가드레일): 카피는 "최대 X원 규모"까지 — 수령 보장 표현 금지. 집계는 "금액 확인된 공고 기준" 병기.

---

### FR-009: 지원금 필터·서빙 노출 (api·web 파트)

#### AC-031: 지원금 유무·하한 필터가 정확히 거른다 (Happy / Must)
```gherkin
Given: max_support_amount가 1억·5천만·NULL인 canonical 공고가 섞여 있는 상태
When:  GET /api/v1/opportunities?hasAmount=true / ?minAmount=80000000 을 각각 호출한다
Then:  hasAmount=true는 금액 non-null 2건만, minAmount=80000000은 1억 1건만 반환한다
       (NULL 공고는 minAmount 지정 시 자동 제외 — "미상=0원 취급" 금지)
```
**검증**
- [ ] 자동: 리포지토리 슬라이스(Testcontainers) — 유무·하한·기존 필터(persona 등)와의 AND 조합
- [ ] 자동: E2E(MockMvc) — 파라미터 연결·응답 필드

#### AC-032: 리스트 응답·카드에 금액이 노출된다 (Happy / Must)
```gherkin
Given: max_support_amount = 100000000, support_amount = "최대 1억원"인 공고
When:  리스트 API를 호출하고 카드를 렌더한다
Then:  응답에 maxSupportAmount=100000000·supportAmount="최대 1억원"이 실리고,
       카드에 "최대 1억원" 사실 서술로 표시된다(수령 보장 표현 금지 — FR-008 가드레일).
       금액 미상 공고는 두 필드 null + 카드 금액 영역 미표시
```
**검증**
- [ ] 자동: E2E(MockMvc) — 응답 필드 직렬화(non-null·null 케이스)
- [ ] 수동(web): 지원금 필터 적용 → 카드 금액 표시 확인, "받을 수 있" 문구 grep 0건

#### AC-033: 잘못된 필터 값은 400이다 (Negative / Must)
```gherkin
Given: 서비스 정상 상태
When:  ?hasAmount=yes / ?minAmount=abc / ?minAmount=-1 을 각각 호출한다
Then:  세 경우 모두 400 INVALID_PARAM을 반환한다 (AC-014 준용)
```
**검증**
- [ ] 자동: 요청 파싱 단위 테스트 + E2E(MockMvc) 400 검증

---

### FR-010: 쇼케이스 — 창업자 제품 홍보의 장

#### AC-034: 등록은 선검수로 접수되고, 승인 전에는 공개 지면에 나오지 않는다 (Happy / Must)
```gherkin
Given: 로그인 사용자
When:  POST /api/v1/showcase (유효한 multipart)
Then:  202 + id 반환, status=PENDING으로 저장되고,
       GET /api/v1/showcase 리스트와 GET /{id} 상세(404)에 노출되지 않는다.
       DB에서 APPROVED로 승인하면 리스트·상세에 노출된다
```
**검증**
- [x] 자동: `ShowcaseServiceTest`(숨김/승인 노출) + `ShowcaseApiTest`(202·리스트 빈 배열·승인 후 200)

#### AC-035: 본인 수정은 재검수로 돌아가고, 남의 글 수정·삭제는 404다 (Edge / Must)
```gherkin
Given: APPROVED 상태의 내 제품 / 다른 사용자의 제품
When:  PUT /api/v1/showcase/{id} (본인) / PUT·DELETE (남의 것)
Then:  본인 수정은 202 + status=PENDING 복귀(공개 지면에서 내려감),
       남의 것은 404 NOT_FOUND (존재 노출 방지)
```
**검증**
- [x] 자동: `ShowcaseServiceTest#editingResetsToPending`·`#editingOthersProductIsNotFound`

#### AC-036: 응원은 1인 1제품 토글이다 (Happy / Must)
```gherkin
Given: 승인된 제품 + 로그인 사용자
When:  PUT /api/v1/showcase/{id}/cheer 를 두 번 호출
Then:  1회차 { cheered: true, cheers: 1 } / 2회차 { cheered: false, cheers: 0 }
```
**검증**
- [x] 자동: `ShowcaseApiTest#cheerToggles`

#### AC-037: 댓글 작성자는 마스킹 표시명으로만 노출된다 — PII 최소 (Must)
```gherkin
Given: 승인된 제품 + 로그인 사용자(email archer@example.com)
When:  댓글 작성 후 상세 조회
Then:  comments[].displayName == "ar***" (이메일 원문·계정 정보 미노출),
       본인 댓글은 mine=true (삭제 버튼 노출용)
```
**검증**
- [x] 자동: `ShowcaseApiTest#commentShowsMaskedDisplayName`

#### AC-038: 웹 지면 — 전용 탭·빈 상태·로그인 게이트·홈 주간 섹션 (수동 / Must)
```gherkin
Given: 웹(/showcase, /showcase/new, 홈)
Then:  쇼케이스 리스트는 승인작만 카드로 노출(카테고리·정렬 칩 동작),
       검수 중 제품 상세 진입 시 빈 상태(404) 화면,
       비로그인 등록 페이지는 로그인 유도 화면,
       홈 하단 "이번 주 새로 열린 창" 섹션은 최근 7일 승인작이 있을 때만 노출(공고 지면과 분리)
```
**검증**
- [x] 수동: 2026-08-01 로컬 확인(리스트·상세·404·로그인 게이트·홈 섹션·모바일 Nav 메뉴)

---

### FR-011: 민간 공고 수집 (하이브리드)

> **스키마 전제 — v2 저장 계층 3종**(data-model §2, 3인 합의 대상). 아래 AC는 `source_registry` /
> `source_record`(관측 + 자체 파생 + `review_status`) / `opportunity`(실체 = dedup 그룹, `is_visible`)를
> 전제로 쓰였다. v1의 `dedup_group_id`·`is_canonical`·`opportunity.review_status`는 v2에 없으므로
> **fixture는 `source_record` 멤버 + 그 멤버가 매달린 `opportunity` 1행**으로 만든다.
> v2가 합의되지 않으면 이 AC들은 v1 컬럼 기준으로 되돌려야 한다.

#### AC-039: 화이트리스트 4소스가 pending으로 적재된다 (Happy / Must)
```gherkin
Given: 화이트리스트 4소스(asan-nanum·kakao-impact·sopoong·kb-innovation-hub)의 실제 응답 표본 fixture
       + source_registry에 7종이 seed된 DB
When:  민간 수집 배치를 실행한다
Then:  소스별 source_record가 review_status='pending'·requires_review=true로 적재되고,
       external_id·title·detail_url·source_code가 NOT NULL이며,
       is_publishable(생성 컬럼)이 false로 계산되고,
       raw에 공고 본문 전문이 없다(사실 필드 + 원문 URL + 수집 메타만 — data-model §6-F 규칙 7)
And:   review_status를 빼고 INSERT하면 NOT NULL 위반으로 실패한다
       (DEFAULT가 없다 — 상태 누락이 "즉시 공개"로 새는 경로 차단, fail-closed. §2-B)
And:   미편입 source(오타 'asan-nanm' · 백로그 'sparklabs')는 review_status가
       유효해도 fk_source_record_registry로 INSERT가 실패한다
       (미편입 값은 목록엔 뜨지만 같은 값의 source 필터가 400이 되는 계약 불일치를 만든다)
And:   ('asan-nanum', requires_review=false) / ('k-startup', review_status='pending')은
       각각 복합 FK와 ck_source_record_review로 거부된다
       (민간이 검수를 건너뛰는 행 · 공공이 검수 큐를 오염시키는 행)
And:   source_registry에 (kind='private', requires_review=false) 행을 INSERT하면
       ck_source_registry_review로 실패한다 —
       registry seed 한 줄의 오입력으로 그 소스 전체가 검수 없이 노출되는
       입구를 막는다(source_record 쪽 게이트는 이 오입력을 전부 통과시킨다)
```
**검증**
- [ ] **수동(웹)**: 민간 4소스 각각 1건을 승인한 뒤 카드·상세의 출처 표기가 **한글 라벨**(아산나눔재단·카카오임팩트·소풍벤처스·KB이노베이션허브)로 뜨고, 출처 필터에 네 항목이 선택 가능한지. `SOURCE_LABELS` 누락 시 `sourceLabel()`이 `asan-nanum` 같은 내부 값을 그대로 노출하고 필터에서도 사라진다(PRD FR-011 10항). 라벨의 단일 진실은 `source_registry.display_name`(§2-A)
- [ ] 자동: `apps/ingest/tests/` — 소스별 fixture 파싱 + 필수 필드 + raw 정책(전문 부재) 검증
- [ ] 자동: 실DB 통합(pytest) 또는 리포지토리 슬라이스(Testcontainers) — `review_status` 누락 INSERT가 NOT NULL 위반으로 거부됨
- [ ] 자동: 동 — 미편입/오타 `source_code` INSERT가 **FK 위반**으로 거부됨 (v1은 `ck_opportunity_source` CHECK였다 — v2는 registry 행이 없으면 자동으로 막힌다)
- [ ] 자동: 동 — 민간/공공 ↔ `review_status` 불일치 2케이스가 복합 FK·CHECK로 거부됨
- [ ] 자동: 동 — `source_registry`의 `kind` ↔ `requires_review` 불일치 INSERT가 `ck_source_registry_review`로 거부됨

#### AC-040: 검수 전 공고는 어떤 서빙 경로에도 노출되지 않는다 (Negative / Must)
```gherkin
Given: fixture를 두 벌로 나눈다 —
       (A) 최상위 경로용: 단독(멤버 1개) 민간 공고 3건 — pending·rejected·approved 각 1건 +
           공공(not_required) 1건. 넷 다 opportunity 행을 하나씩 갖고,
           병합 결과 is_visible은 approved·공공만 true다(§2-C 불변식 1).
           ※ pending 건은 아직 아무도 판정하지 않은 상태이고,
             rejected 건은 사람이 반려한 상태다. 둘 다 is_visible=false여야 한다.
       (B) otherSources용: pending·rejected·approved 민간 + 공공 4개 source_record가
           **한 opportunity에 매달려** 있고 대표는 공공 멤버
When:  (A)로 리스트·검색(q)·상세({id})·찜(ids=)·홈 지표(stats)를 각각 호출하고,
       (B)로 그 opportunity 상세 응답에 실린 otherSources를 확인한다
Then:  pending·rejected 단독 건은 다섯 경로 모두에서 나타나지 않고
       (`WHERE is_visible` 하나가 유일한 게이트이며 ids=도 예외가 아니다 — §3),
       stats는 open·newToday·closingSoon 세 집계 모두에서 이들을 제외한다
And:   (B) 상세의 otherSources에는 is_publishable 형제(approved)만 실리고
       pending·rejected 형제의 source·detailUrl은 나타나지 않는다
       (멤버를 직접 조회하는 유일한 경로 — 그룹 전체가 노출 가능해도 멤버 단위로 걸러야 한다)
And:   (B)의 pending 형제에만 식별 가능한 금액·페르소나(예: max_support_amount=777원,
       target_audience_type=['UNIV_STUDENT'])를 넣어 두면,
       그 값이 병합 결과(opportunity)에 **나타나지 않는다** —
       상속 donor도 is_publishable 멤버로 한정되기 때문이다(§6-D 단계 6).
       대표만 걸러서는 막지 못하는 경로다: 대표는 승인된 공공인데
       금액이 없어 미검수 민간 멤버 값이 카드·금액 필터로 새어 나간다
```
**검증**
- [ ] 자동: 리포지토리 슬라이스(Testcontainers) + E2E(MockMvc) — (A)로 다섯 경로 각각(stats는 집계 3종 전부)
- [ ] 자동: 동 — (B) 단일 opportunity fixture로 상세 응답의 `otherSources` 중첩 검증(`is_publishable` 조건 제거 시 실패해야)
- [ ] 자동: 병합 배치 실DB 통합 — **상속 오염 검증**: pending 형제의 표식 금액(777원)·페르소나가 병합 결과에 없음. 상속 입력에서 `is_publishable` 필터를 빼면 실패해야 한다
- [ ] 자동: 동 — **수동 태그 잔존 검증**: 공공 + 승인 민간이 한 그룹이고 민간 검수 때 `manual_*`를 매긴 상태에서 그 민간 멤버를 **재검수 지정**하면, 공공 멤버로 계속 노출되는 공고의 `targetStartupStage`·`targetAudienceType`에 그 태그가 **남지 않는지**(§2-C 불변식 6). `manual_*`는 노출 자격과 무관하게 합쳐지므로 **상속 donor 제한으로는 안 걸리는 별개 경로**다 — 위 항목의 `source_record.target_*` 표식으로는 잡히지 않는다
- [ ] 자동: 병합 배치 실DB 통합 — **불변식 1·2 검사**: `is_visible = true` ⇔ `is_publishable` 멤버 ≥ 1, 그리고 **`is_visible = true`인 행에 한해** `representative_record_id`가 `is_publishable` 멤버를 가리킨다. 멤버가 전부 pending·rejected인 그룹은 노출 가능 멤버가 아예 없으므로 대표는 아무 멤버나 두고 `is_visible=false`로 숨는다(§2-C 불변식 2 — 대표 컬럼이 `NOT NULL`이라 비워 둘 수 없다). v2는 서빙 조건이 한 단어라 **누락의 위험이 서빙 쿼리에서 병합 배치로 옮겨간다** — 게이트를 진짜로 지키는 곳이 여기다
- [ ] **회귀 방지 확인**: 서빙 쿼리에서 `WHERE is_visible`을 빼면 (A) 테스트가, `AND r.is_publishable`을 빼면 (B) 테스트가 **각각 실패해야** 한다. 통과한다면 fixture가 다른 조건에 우연히 기대고 있는 것이므로 fixture를 고친다(이 AC의 v1판이 `is_canonical`에 기대다 그 함정에 빠졌다)

#### AC-041: CLI 검수 — 승인·반려·태깅이 반영되고 재수집에 안 밀린다 (Happy+Edge / Must)
```gherkin
Given: pending 민간 source_record 2건
When:  검수 CLI로 1건은 페르소나 태깅(표준 코드 또는 '미상'=NULL)과 함께 승인, 1건은 반려한 뒤,
       민간 수집 배치 + 병합 배치를 **2회** 재실행한다
Then:  승인 건은 approved가 되고 그 opportunity의 is_visible=true로 서빙에 나타나며,
       반려 건은 rejected 유지(재수집이 review_status를 pending으로 되돌리지 않음),
       두 건 모두 내용 필드(title 등)는 재수집으로 갱신된다(UPSERT — first_seen_at 불변)
And:   승인 건의 태깅값이 **2회 재실행 후에도 target_startup_stage·target_audience_type에 남아 있다** —
       태깅은 opportunity.manual_* 에 기록되고 병합은 그 컬럼을 읽어 합집합할 뿐 쓰지 않는다
       (§6-D 단계 6). manual_*을 UPSERT의 SET 목록에 넣거나 태깅을 target_* 에 직접 쓰면,
       민간 멤버의 source_record.target_* 가 항상 NULL이라 다음 배치에서 태그가 지워지고
       공고가 페르소나 탭에서 사라진다. 1회로는 드러나지 않아 2회로 잡는다
And:   '미상'으로 태깅한 건은 target_* 가 NULL이면서 manual_tagged_at은 기록돼 있어,
       검수 큐·리포트의 "미태깅" 집계에 다시 잡히지 않는다
And:   마감된 공공 멤버와 같은 그룹인 진행 중 민간 건을 승인하면,
       민간 멤버가 representative_record_id가 된다 — 대표 선정은 출처보다
       노출 가능성이 우선이므로(§6-D 규칙 5 ①). 출처를 앞세우면
       마감 공공 행이 대표가 되어 status=open 목록에서 그룹째 사라진다(AC-010)
And:   공공 공고와 중복인 pending 건을 승인하면, 승인 트랜잭션 안에서
       dedup 판정·재병합·태깅(§6-F 규칙 6의 ①~④)이 함께 커밋된다 —
       승인 "직후"(다음 수집 배치 전) 리스트·검색을 조회해도
       공공 원본과 민간 중복본이 opportunity 2행으로 동시에 노출되는 구간이 없다
And:   검수자가 pending 내용을 읽은 뒤 판정을 확정하기 전에 수집 배치가
       같은 source_record를 갱신하면, **승인이든 반려든** updated_at 불일치로 0행 갱신되어
       취소되고 "내용이 바뀌었다 — 재검수" 안내가 뜬다.
       특히 반려는 rejected가 이후 재수집에도 불변이라(규칙 4),
       못 본 내용이 영구 반려로 굳어 검수 큐에서 유실되는 것을 막는다
```
**검증**
- [ ] 자동: pytest — 검수 함수 단위 + 실DB 통합(재수집 멱등·`review_status` 불변)
- [ ] 자동: 실DB 통합 — **수집+병합 2회 재실행 후 태깅값 보존**. `manual_*`를 병합 UPSERT의 SET 목록에 넣으면 이 테스트가 실패해야 한다
- [ ] 자동: 실DB 통합 — '미상' 태깅 건이 `target_*` NULL + `manual_tagged_at` NOT NULL이고 미태깅 집계에서 빠지는지
- [ ] 자동: 실DB 통합 — 중복 건 승인 **직후**(배치 재실행 전) 조회에 `opportunity` 1행만 노출
- [ ] 자동: 실DB 경합 통합 — 읽기 후 판정 전에 UPSERT를 끼워넣고 **승인·반려·재검수 지정 각각** 0행으로 거부되는지(낙관적 동시성 — 배치와의 경합). 재검수 지정을 빼면 검수자가 낡은 내용을 보고 **서빙 중인 공고를 숨기는** 구현이 통과한다(§6-F 규칙 5의 `:expected_status`는 세 판정 전부에 걸린다)
- [ ] 자동: 실DB 경합 통합 — **두 검수자가 같은 pending 행을 읽은 뒤 서로 반대 판정**(승인 vs 반려)을 하면 **먼저 커밋한 쪽만 성공**하고 나중 판정은 0행으로 거부되는지(검수자 간 경합 — `review_status = :expected_status` 조건 + 판정 시 `updated_at` 갱신이 없으면 나중 판정이 앞선 결정을 덮는다)

#### AC-042: 크롤링 예절 — robots 불허·차단 시 소스를 포기한다 (Negative / Must)
```gherkin
Given: robots.txt가 수집 경로를 Disallow하는 소스 A + HTTP 403/429를 반환하는 소스 B + 정상 소스 C
When:  민간 수집 배치를 실행한다
Then:  A는 콘텐츠 요청 없이 스킵, B는 즉시 중단·스킵되고 각각 리포트에 사유가 기록되며,
       C는 정상 수집된다(소스 격리 — AC-004 준용).
       모든 요청은 식별 User-Agent(changmun-bot)를 싣고 요청 간 딜레이(≥1초)를 지킨다
```
**검증**
- [ ] 자동: pytest — robots 파서 판정·403/429 처리·UA 헤더·딜레이 파라미터 (우회 로직이 없음을 코드 리뷰로 확인)

#### AC-043: 파싱 0건이면 파손 의심 경고를 남긴다 (Edge / Must)
```gherkin
Given: 정상 수집 이력이 있는 민간 소스의 목록 페이지가 개편되어 파싱 결과가 0건이 되는 fixture
When:  수집 배치를 실행한다
Then:  배치는 실패하지 않고, 리포트에 해당 소스 "0건 — 파손 의심" 경고가 기록된다
       (셀렉터 파손은 조용히 죽는다 — 마감 지난 공고 방치는 가드레일 2 위반이므로 반드시 가시화)
```
**검증**
- [ ] 자동: pytest — 0건 리포트 경고 + pending 잔량 표기

#### AC-044: 재수집은 내용만 갱신하고 승인 상태를 건드리지 않는다 (Edge / Must)
```gherkin
Given: approved 상태로 서빙 중인 민간 source_record 1건 (검수 시 수동 태깅 완료)
When:  마감일·제목·금액 표기가 각각 바뀐 fixture로 재수집한다
Then:  내용 필드는 전부 갱신되고 review_status는 'approved' 그대로이며,
       공고는 계속 노출된다 (first_seen_at 불변)
       — 크롤러가 새로 읽은 값이 어제 값보다 정확하므로 숨길 이유가 없다.
         검수가 판단한 건 "이 공고를 실을 만한가"이고 마감일이 바뀐다고 달라지지 않는다
And:   rejected 건도 재수집으로 부활하지 않고, pending 건도 그대로 대기한다
       — 배치는 어떤 상태도 바꾸지 않는다. 상태를 바꾸는 주체는 사람뿐이고
       전이는 둘이다: 검수 판정(pending → approved/rejected)과
       재검수 지정(approved → pending). 집합의 단일 진실은 data-model §6-F 규칙 4
And:   제목이 통째로 바뀌면(같은 external_id에 전혀 다른 공고) 배치는 상태를 그대로 두고
       수집 리포트에 경고만 남긴다. 사람이 검수 CLI로 재검수 지정(approved → pending)하면
       그때 검수 큐로 돌아간다 — 상태를 바꾸는 주체는 사람뿐이다(§6-F 규칙 4).
       게시판 글 번호 재활용이 유일하게 남는 위험인데,
       파일럿 4소스의 식별자는 재사용되지 않는 체계라 발생 가능성이 낮다
And:   eligibility_detail(지원 대상·자격 문구)이 바뀌면
       그 실체의 manual_*·manual_tagged_at만 비워져 태깅 큐로 간다(§6-F 규칙 10).
       상태는 approved 그대로고 공고도 계속 노출되며 페르소나 탭에서만 "조건 미상"으로 빠진다 —
       민간은 검수자가 이 문구를 읽고 페르소나를 매기므로 태그의 근거는 사라지지만,
       태그가 낡았다고 멀쩡한 공고를 숨길 이유는 없다(절대규칙 8)
```
**검증**
- [ ] 자동: pytest 실DB 재수집 통합 — 마감일·제목·금액을 바꿔도 `review_status`가 전부 불변이고 내용만 갱신되는지. UPSERT의 `DO UPDATE SET` 목록에 `review_status`가 들어가면 실패해야 한다
- [ ] 자동: 동 — 제목 전면 변경 시 리포트에 경고 항목이 남고 **배치는 상태를 바꾸지 않는지**
- [ ] 자동: 검수 CLI 실DB 통합 — 재검수 지정이 `approved` → `pending`으로 되돌리고 **같은 트랜잭션의 재병합·태그 무효화까지** 돌아 해당 공고가 서빙에서 빠지는지(그룹이면 AC-040의 수동 태그 잔존 검증과 짝). 상태만 바꾸고 재병합을 빠뜨리면 `opportunity.is_visible`이 그대로라 공고가 계속 노출되므로 **이 테스트가 실패해야 한다**(§2-C 불변식 5)
- [ ] 자동: 동 — `eligibility_detail`만 변경 → 상태 불변 + `manual_*`·`manual_tagged_at` 초기화 + 공고 계속 노출

---

## 3. 공통 AC (Cross-Cutting)

| ID | 기준 | 검증 방법 |
|---|---|---|
| CC-01 | API 실패 시 PRD §9 정책대로: 토스트+재시도 버튼 (로깅 API만 예외 — 조용히 무시) | 네트워크 차단 후 리스트/상세/검색 수행 |
| CC-02 | 모든 목록 화면(S1·S3·S4)은 빈 상태 UI를 가진다 | 데이터 0건 상태로 각 화면 확인 |
| CC-03 | 리스트·상세 API p95 < 1초, 상세 페이지 LCP < 2.5초 (PRD §5 제안값) | 부하 도구(간단히 k6/ab) + Lighthouse |
| CC-04 | 공고 상세 페이지에 title/description 메타태그 + sitemap.xml 존재 | 페이지 소스 확인 + /sitemap.xml 응답 |
| CC-05 | 리스트는 항상 `is_canonical=true`만 노출한다 | 비-canonical fixture가 리스트에 없음 SQL+API 대조 |
| CC-06 | 스키마는 Flyway 마이그레이션만으로 재현된다 (`ddl-auto=validate` 통과) | 빈 DB → migrate → Spring 기동 성공 |
| CC-07 | 모든 페이지가 페이지 번호 URL을 가진다(`?page=N`) — SEO | 페이지 이동 시 URL 변경 확인 |

---

## 4. Definition of Done (Phase 1 / MVP)

- [ ] 매핑 테이블에서 **Phase 1 범위 FR(FR-001~009)의 모든 Must AC 통과** (Should는 가능한 만큼, 미통과 시 명시). **FR-010(쇼케이스)은 스코프 확장, FR-011은 Phase 2라 이 게이트에서 제외** — 아래 별도 DoD로 판정한다(그러지 않으면 Phase 2 미구현 때문에 Phase 1 출시 판정이 영구히 불가능해진다)
- [ ] 공통 AC CC-01~07 만족
- [ ] 빌드/린트/타입 체크 에러 0
- [ ] 자동 테스트 스위트 전체 통과 (ingest pytest + Spring 테스트)
- [ ] **dedup 실데이터 표본 50쌍 수동 검수 — 오합치 0건** (AC-008 출시 게이트)
- [ ] 3소스 수집 리포트(신규/갱신/스킵 건수)가 일 1회 정상 생성
- [ ] event_log가 실트래픽으로 적재되기 시작함 (PRD Goal 4)
- [ ] PRD Out-of-Scope 기능이 구현돼 있지 않음 (추천·알림·관리자 UI 없음) ← 과잉 구현 방지. 로그인은 In-Scope로 확장됨(팀 3인 합의)

---

## 4-2. Definition of Done (Phase 2 — FR-011 민간 하이브리드 수집)

> Phase 1 출시와 독립적으로 판정한다. 이 DoD는 FR-011 **구현 PR**의 완료 기준이며, 현재 문서(계약)만 확정된 상태다.

- [ ] AC-039~044의 모든 **Must AC 통과** — 각 AC의 **검증 항목 전부**(자동 + 웹 수동). 여기에 개수를 적지 않는 건 의도다: 라운드마다 항목이 늘어 숫자가 먼저 낡고, 그러면 **나중에 추가된 항목(인증 거부·배치 보험 등)이 판정에서 조용히 빠진다**
- [ ] **v2 저장 계층 마이그레이션(data-model §2-D) 적용** — `source_registry` seed 7종 · `opportunity`→`source_record` RENAME(id 승계) · 신 `opportunity` 생성 시 **현재 `is_canonical=true` 행의 id 승계** · `bookmark` FK 재지정. 이관 후 **기존 상세 URL 전량 보존**을 실측 표본으로 확인하고, 라이브 29,874행에서 제약 위반 0건
- [ ] **실제 v1 덤프로 업그레이드 1회 리허설** — RENAME이 인덱스·제약 이름을 옮기지 않아 `opportunity_pkey` 포함 7개가 신 테이블과 충돌한다(§2-D 3단계). 이름 정리가 신 테이블 생성보다 앞서는지를 리뷰가 아니라 **실행으로** 고정한다
- [ ] 이관과 같은 PR에서 **v1 컬럼을 전제로 한 문서 문구 동반 갱신** — data-model §2-D 말미의 대상 목록 전부(AC-005·010·024, CC-05, api-spec §0 노출 범위, `.claude/rules/api.md`, README 등)
- [ ] 파일럿 4소스 수집 리포트가 일 1회 정상 생성(파싱 0건 경고 + pending 잔량 포함 — AC-043)
- [ ] 검수 CLI로 승인·반려·재검수 지정·태깅 1회씩 실제 수행(`apps/ingest` 스크립트 — 웹 검수 화면 없음)
- [ ] 웹 캐시 무효화 경로 동작 확인(홈·`/search`·상세 3곳 + 실패 복구 3경로 + **미인증·시크릿 불일치 요청이 무효화를 수행하지 않고 401/403** — PRD FR-011 9항). 태그 전체를 날리는 공개 경로라 무인증이면 외부에서 ISR을 상시 비워 origin에 부하를 밀어 넣을 수 있다
- [ ] 민간 4종 출처 라벨·필터 노출 확인(PRD FR-011 10항)
- [ ] 크롤링 예절 준수 확인: robots 검사·UA·딜레이 ≥1초, 우회 로직 부재를 코드 리뷰로 확인 (AC-042)

---

## 부록: 작성 체크리스트
- [x] 모든 AC가 FR ID와 매핑
- [x] Then 절이 관찰 가능한 결과(상태·수치·화면)
- [x] 판정 불가 단어("잘", "적절히") 없음
- [x] Must FR마다 Negative AC 최소 1개 (FR-001: AC-003·004 / FR-002: AC-008 / FR-003: AC-014 / FR-004: AC-016 / FR-007: AC-026·027 / FR-011: AC-040·042)
- [x] 검증 방법 비어 있는 AC 없음
