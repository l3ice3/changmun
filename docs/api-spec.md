# api-spec.md

서빙 API(Spring) 계약. 프론트(Next.js)와 백엔드는 **이 문서의 필드명·구조를 그대로** 사용한다(임의 변경 금지).
연결: `data-model.md`(스키마) · `screens.md`(화면→API) · `AC.md`(판정 기준).

---

## 0. 공통 규칙

| 항목 | 규칙 |
|---|---|
| Base | `/api/v1` · JSON · UTF-8 · 모든 엔드포인트 **비인증(공개)** |
| 네이밍 | **camelCase** (예: `applicationDeadline`, `dDay`) |
| 날짜 | `YYYY-MM-DD` (date) / `ISO 8601` (datetime) |
| 계산 필드 | `status`·`dDay`·`closingSoon`·`badges`는 **서버가 계산해 포함** — 프론트 재계산 금지 (AC-013) |
| 노출 범위 | 리스트·검색은 `is_canonical=true`만. **단 `ids=` 조회는 canonical 여부 무관**(찜한 공고가 강등돼도 사라지면 안 됨 — AC-024) |
| 에러 바디 | **RFC7807 `ProblemDetail`**(Spring Boot 내장): `{ type, title, status, detail, instance }` + 확장 필드 `code` 보존 — `INVALID_PARAM`(400) / `NOT_FOUND`(404) / `INTERNAL`(500). 프론트는 `code`로 분기 |
| 캐싱 | 리스트·상세·glossary는 public cache 허용(데이터 갱신=일 1회). 상세 페이지는 ISR과 동기 |

### status 계산 규칙 (단일 정의 — 서버만 구현)
```
is_always_open = true                  → status = "ALWAYS_OPEN", dDay = null
deadline ≥ 오늘                         → status = "OPEN",        dDay = (deadline - 오늘)일
deadline < 오늘                         → status = "CLOSED",      dDay = null
deadline = null AND is_always_open=false → status = "UNDATED"(기간 미상), dDay = null
```
- `closingSoon = (status=="OPEN" AND dDay ≤ 7)`
- 기본 노출(필터 `status=open`)에는 `OPEN + ALWAYS_OPEN + UNDATED` 포함(기간 미상이라고 숨기지 않음 — 가드레일 2). `CLOSED`는 `status=all`일 때만.
- 정렬 `deadline`: `application_deadline ASC NULLS LAST` (상시·기간미상은 맨 뒤).

### badges (코드 → 라벨 매핑, 프론트가 라벨 렌더)
| 코드 | 라벨 | 조건 |
|---|---|---|
| `NO_BIZ_REQUIRED` | 사업자 불필요 | `targetStartupStage` ∋ `PRE_STARTUP` |
| `CLOSING_SOON` | 마감임박 | `closingSoon=true` |
| `ALWAYS_OPEN` | 상시모집 | `status=ALWAYS_OPEN` |
| `CONDITION_UNKNOWN` | 조건 미상 | `targetStartupStage`·`targetAudienceType` 모두 null (AC-009) |

### 공통 enum (요청 파라미터)
- `persona`: `PRE_STARTUP`(예비) · `UNIV_STUDENT`(대학생) · `EARLY_STAGE`(초기 = stage ∈ {LT_1Y,LT_2Y,LT_3Y}) · 생략=전체
- `status`: `open`(기본) · `all`
- `sort`: `deadline`(기본) · `latest`(`first_seen_at DESC`)
- `region`: 17개 시도 라벨 또는 `전국` (URL 인코딩된 한글 그대로). **요청은 단일 지역**(필터 1개), **응답 `region`은 배열**(공고가 복수 지역일 수 있음 — 서버는 공고의 region 배열에 요청 지역이 포함되면 매칭)
- `category`: 표준 11종+`기타` 라벨 그대로 (data-model §7)
- `source`(응답): `k-startup` · `bizinfo` · `ontong-youth`

---

## 1. GET /api/v1/opportunities — 리스트/검색/찜 조회

### 요청 (쿼리 파라미터)
| 파라미터 | 타입 | 기본 | 설명 |
|---|---|---|---|
| `persona` | enum | (없음) | 페르소나 탭. 잘못된 값 → 400 (AC-014) |
| `region` | string | (없음) | 시도 필터 |
| `category` | string | (없음) | 카테고리 필터 |
| `source` | enum | (없음) | 출처 필터: `k-startup` · `bizinfo` · `ontong-youth`. 잘못된 값 → 400 (AC-014) |
| `status` | enum | `open` | `open`=진행중(상시·기간미상 포함) / `all` |
| `q` | string | (없음) | 부분일치 검색(title+summary, pg_trgm). **최소 2글자**, 1글자 → 400 (AC-020) |
| `ids` | csv | (없음) | 찜 조회. 최대 50개. **지정 시 다른 필터 무시**, 요청 순서대로 반환, 없는 id는 누락(에러 아님 — AC-023) |
| `sort` | enum | `deadline` | 정렬 |
| `page` | int | 1 | 1-base. 범위 초과 → 200 + 빈 items (AC-014) |
| `size` | int | 20 | 최대 50 |

### 응답 `200`
```json
{
  "items": [
    {
      "id": 1234,
      "source": "k-startup",
      "title": "2026년 예비창업패키지 창업자 모집",
      "organization": "중소벤처기업부",
      "category": "사업화",
      "region": ["전국"],
      "applicationStartDate": "2026-06-01",
      "applicationDeadline": "2026-06-30",
      "isAlwaysOpen": false,
      "status": "OPEN",
      "dDay": 20,
      "closingSoon": false,
      "badges": ["NO_BIZ_REQUIRED"],
      "targetStartupStage": ["PRE_STARTUP"],
      "targetAudienceType": ["GENERAL", "UNIV_STUDENT"],
      "eligibilityDetail": "예비창업자(사업자등록 이력이 없는 자) ...",
      "detailUrl": "https://www.k-startup.go.kr/..."
    }
  ],
  "page": 1,
  "size": 20,
  "totalItems": 137,
  "totalPages": 7
}
```
- 카드에 필요한 전부 포함(`screens.md` S1). `eligibilityDetail`은 프론트가 1줄 말줄임.
- 결과 0건 → `200` + `"items": []` (AC-012).

### GET /api/v1/opportunities/stats — 홈 지표
홈 히어로 카운트. **계산값 미저장**(절대 규칙 2) — 조회 시 `is_canonical = true` 기준 count. (literal 경로라 `/{id}`보다 우선 매칭)
| 필드 | 정의 |
|---|---|
| `open` | 진행 중(상시·기간미상 포함, `CLOSED` 제외) |
| `newToday` | `first_seen_at >= CURRENT_DATE` (오늘 처음 수집) |
| `closingSoon` | 마감 ≤ 7일(상시 제외) — §0 `closingSoon` 산식과 동일 임계 |
```json
{ "open": 137, "newToday": 4, "closingSoon": 12 }
```

---

## 2. GET /api/v1/opportunities/{id} — 상세

### 요청 (경로 파라미터)
| 파라미터 | 타입 | 설명 |
|---|---|---|
| `id` | int (path) | 공고 ID |

### 응답 `200` (리스트 항목 필드 **전부** + 아래 추가)
```json
{
  "...리스트 항목과 동일 필드...": "...",
  "summary": "본 사업은 혁신적인 아이디어를 보유한 예비창업자의 사업화를 지원...",
  "organizationType": "중앙부처",
  "supportAmount": null,
  "applyUrl": "https://www.k-startup.go.kr/apply/...",
  "matchedTerms": [
    { "term": "사업화자금", "description": "아이디어를 실제 제품/서비스로 만드는 데 쓰도록 주는 돈" }
  ],
  "otherSources": [
    { "source": "bizinfo", "detailUrl": "https://www.bizinfo.go.kr/..." }
  ]
}
```
- `matchedTerms`: summary·eligibilityDetail에서 glossary 매칭된 용어만(0개면 빈 배열 — AC-015, 프론트는 빈 배열 시 영역 미표시).
- `applyUrl` null 가능 → 프론트는 "공고 원문 보기"만 (AC-017).
- `otherSources`: dedup 그룹 내 비-canonical 출처(선택 표시, 없으면 빈 배열). **Could** — MVP 생략 가능.
- 마감 공고도 `200` + `status="CLOSED"` (AC-018). 없는 id → `404` (AC-016).

---

## 3. GET /api/v1/glossary — 용어 사전

### 요청
- 없음 (파라미터·바디 없음)

### 응답 `200`
```json
{ "items": [ { "term": "업력", "description": "사업자등록 후 지난 기간. '업력 3년 미만'이면 등록한 지 3년이 안 된 기업" } ] }
```
- 전체 사전 일괄 반환(수십 개 규모) — 프론트 캐싱. 페이지네이션 없음.

---

## 4. POST /api/v1/events — 행동 로그

### 요청 (바디)
```json
{
  "clientId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "outbound_click",
  "payload": { "opportunityId": 1234, "linkType": "apply" },
  "occurredAt": "2026-06-10T12:34:56+09:00"
}
```
- `eventType` 화이트리스트: `list_view` · `detail_view` · `outbound_click` · `bookmark_add` · `bookmark_remove` · `search`
- `payload` 키 화이트리스트(이벤트별 정의, 그 외 키 거부) — **PII 차단 장치** (AC-027). 허용 키: `opportunityId`, `persona`, `region`, `category`, `statusFilter`, `q`, `page`, `linkType`, `resultCount`
- `occurredAt` 생략 시 서버 수신 시각.

### 응답 `202`
```json
{ "accepted": true }
```
- 본문 검증 실패는 `400`. **클라이언트는 fire-and-forget**(응답·실패 무시, UX 차단 금지 — AC-026).

---

## 5. AC 교차 참조 (판정용 요약)
| AC | 이 문서의 근거 |
|---|---|
| AC-011 | §1 persona 파라미터 + canonical 노출 + 정렬 규칙 |
| AC-012/014 | §1 빈 items / 400 `INVALID_PARAM` / 범위 초과 200 |
| AC-013 | §0 status 계산 규칙 + badges 코드 |
| AC-015~018 | §2 matchedTerms·applyUrl null·CLOSED 200·404 |
| AC-019~021 | §1 `q`(2글자 최소, 파라미터 바인딩) |
| AC-022~024 | §1 `ids`(순서 보존·누락 허용·canonical 무관) |
| AC-025~027 | §4 eventType·payload 화이트리스트·202 |
