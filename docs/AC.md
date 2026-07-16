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

- [ ] 매핑 테이블의 모든 **Must AC 통과** (Should는 가능한 만큼, 미통과 시 명시)
- [ ] 공통 AC CC-01~07 만족
- [ ] 빌드/린트/타입 체크 에러 0
- [ ] 자동 테스트 스위트 전체 통과 (ingest pytest + Spring 테스트)
- [ ] **dedup 실데이터 표본 50쌍 수동 검수 — 오합치 0건** (AC-008 출시 게이트)
- [ ] 3소스 수집 리포트(신규/갱신/스킵 건수)가 일 1회 정상 생성
- [ ] event_log가 실트래픽으로 적재되기 시작함 (PRD Goal 4)
- [ ] PRD Out-of-Scope 기능이 구현돼 있지 않음 (추천·알림·관리자 UI 없음) ← 과잉 구현 방지. 로그인은 In-Scope로 확장됨(팀 3인 합의)

---

## 부록: 작성 체크리스트
- [x] 모든 AC가 FR ID와 매핑
- [x] Then 절이 관찰 가능한 결과(상태·수치·화면)
- [x] 판정 불가 단어("잘", "적절히") 없음
- [x] Must FR마다 Negative AC 최소 1개 (FR-001: AC-003·004 / FR-002: AC-008 / FR-003: AC-014 / FR-004: AC-016 / FR-007: AC-026·027)
- [x] 검증 방법 비어 있는 AC 없음
