# api-spec.md

서빙 API(Spring) 계약. 프론트(Next.js)와 백엔드는 **이 문서의 필드명·구조를 그대로** 사용한다(임의 변경 금지).
연결: `data-model.md`(스키마) · `screens.md`(화면→API) · `AC.md`(판정 기준).

---

## 0. 공통 규칙

| 항목 | 규칙 |
|---|---|
| Base | `/api/v1` · JSON · UTF-8 · 서빙(리스트·상세·검색·glossary·events)은 **비인증(공개)**. **로그인(OAuth2)** 관련 엔드포인트만 세션 기반(§5) — 로그인은 선택 기능 |
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
- `region`: **16개 시도** 라벨 또는 `전국` (URL 인코딩된 한글 그대로. 2026 행정구역 통합 반영 — 광주+전남은 `전남광주` 단일 라벨, data-model §7). **요청은 단일 지역**(필터 1개), **응답 `region`은 배열**(공고가 복수 지역일 수 있음 — 서버는 공고의 region 배열에 요청 지역이 포함되면 매칭)
- `category`: 표준 11종+`기타` 라벨 그대로 (data-model §7)
- `source`(응답): 공공 `k-startup` · `bizinfo` · `ontong-youth` + 민간(FR-010) `asan-nanum` · `kakao-impact` · `sopoong` · `kb-innovation-hub`. 민간은 **검수 승인분만 서빙**(data-model §6-F — 응답 형식 변화 없음, source 값만 확장)

---

## 1. GET /api/v1/opportunities — 리스트/검색/찜 조회

### 요청 (쿼리 파라미터)
| 파라미터 | 타입 | 기본 | 설명 |
|---|---|---|---|
| `persona` | enum | (없음) | 페르소나 탭. 잘못된 값 → 400 (AC-014) |
| `region` | string | (없음) | 시도 필터 |
| `category` | string | (없음) | 카테고리 필터 |
| `source` | enum | (없음) | 출처 필터: §0 공통 enum의 `source` 값(공공 3 + 민간 4 — FR-010). 잘못된 값 → 400 (AC-014) |
| `status` | enum | `open` | `open`=진행중(상시·기간미상 포함) / `all` |
| `q` | string | (없음) | 부분일치 검색(title+summary, pg_trgm). **최소 2글자**, 1글자 → 400 (AC-020) |
| `hasAmount` | boolean | (없음) | `true`=지원금 확인 공고만(`maxSupportAmount` non-null). `true`/`false` 외 값 → 400 (AC-033) |
| `minAmount` | int | (없음) | 최대 지원액 하한(원 단위, ≥0). 지정 시 금액 미상(NULL)은 자동 제외. 비숫자·음수 → 400 (AC-033). **확장 예약**: 구간 검색 필요 시 `maxAmount`(상한) 추가 예정 — 클라이언트는 하한 단독 계약에 과결합하지 않는다 |
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
      "supportAmount": "최대 1억원",
      "maxSupportAmount": 100000000,
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
- `supportAmount`(원문 표기)·`maxSupportAmount`(기업당/1인당 최대 지원액, 원 단위 — data-model `max_support_amount`)는 미상이면 `null`(억지 채움 금지 — FR-008). 카드 표시는 **"최대 X원" 사실 서술까지만**, 수령 보장 표현 금지(FR-008 가드레일). `total_program_budget`(사업단 예산)은 사용자 필터·카드 대상 아님(집계용). **총예산 원문만 잡힌 공고(`max_support_amount` NULL)도 두 필드 `null`로 서빙** — DB의 `support_amount` 원문(검수용 보존)을 그대로 싣지 않는다.

### GET /api/v1/opportunities/stats — 홈 지표
홈 히어로 카운트. **계산값 미저장**(절대 규칙 2) — 조회 시 `is_canonical = true` **AND `(review_status IS NULL OR review_status = 'approved')`** 기준 count(민간 검수 전·반려 공고는 세 집계 어디에도 포함 안 됨 — FR-010, data-model §6-F). (literal 경로라 `/{id}`보다 우선 매칭)
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
- `payload` 키 화이트리스트(이벤트별 정의, 그 외 키 거부) — **PII 차단 장치** (AC-027). 허용 키: `opportunityId`, `persona`, `region`, `category`, `source`, `statusFilter`, `q`, `page`, `linkType`, `resultCount`, `hasAmount`, `minAmount`
- `occurredAt` 생략 시 서버 수신 시각.

### 응답 `202`
```json
{ "accepted": true }
```
- 본문 검증 실패는 `400`. **클라이언트는 fire-and-forget**(응답·실패 무시, UX 차단 금지 — AC-026).

---

## 5. 인증 (OAuth2 로그인 — 선택 기능)
로그인은 선택 기능이며 비로그인도 전 기능 사용 가능(익명 유지). Spring Security OAuth2 로그인, **세션 쿠키(HttpOnly)** 기반. 프론트는 `credentials: include` + CORS(allowCredentials). PII 최소 수집: 이메일·provider 식별만(data-model §8 `app_user`).

| 메서드 · 경로 | 역할 |
|---|---|
| `GET /oauth2/authorization/{provider}` | 로그인 시작 — 브라우저를 provider로 리다이렉트. `provider` ∈ `google`·`github`·`kakao`·`naver`. (Spring Security 제공) |
| `GET /login/oauth2/code/{provider}` | 콜백(Spring 내부 처리) → `app_user` upsert → 세션 생성 → 프론트로 리다이렉트 |
| `GET /api/v1/auth/me` | 로그인 상태. 비로그인이면 `{ "authenticated": false, "email": null, "provider": null }` |
| `POST /api/v1/auth/logout` | 세션 종료 → `200` |

```json
// GET /api/v1/auth/me (로그인 상태)
{ "authenticated": true, "email": "user@example.com", "provider": "google" }
```
- provider client id/secret은 환경변수(`OAUTH_{PROVIDER}_ID/SECRET`) — 코드 커밋 금지.
- 이메일 미제공(동의 거부 등) 시 로그인 거부(`email_required`).

### 서버측 찜 (로그인 필요 — data-model §8 `bookmark`)
로그인 사용자의 찜을 서버에 보관(기기 간 동기화). **미인증 요청은 `401`.** 비로그인은 계속 localStorage 찜을 쓴다.

| 메서드 · 경로 | 역할 |
|---|---|
| `GET /api/v1/bookmarks` | 내 찜 공고 id 목록(최근순). `{ "opportunityIds": [123, 45] }`. 카드는 프론트가 `?ids=`로 이어 조회 |
| `POST /api/v1/bookmarks/{opportunityId}` | 찜 추가(멱등 — 이미 있으면 무시). `204` |
| `DELETE /api/v1/bookmarks/{opportunityId}` | 찜 삭제. `204` |
- CSRF 미사용 — 세션 쿠키 `SameSite=Lax`로 크로스사이트 방어. 인증은 세션(로그인) 기반.

### 프로필 이미지 (로그인 필요 — 마이페이지, 팀 합의 스코프 확장)
사용자가 업로드한 프로필 이미지. **1MB 이하 · JPEG/PNG/WebP만** 허용(서버 검증 + 멀티파트 한도). 저장은 `app_user` BYTEA 컬럼(data-model §8). **미인증 요청은 `401`.**

| 메서드 · 경로 | 역할 |
|---|---|
| `GET /api/v1/users/me/profile-image` | 내 프로필 이미지 바이너리(저장된 Content-Type으로 응답). 미설정이면 `404`(프론트는 디폴트 아바타 렌더) |
| `PUT /api/v1/users/me/profile-image` | 업로드 — multipart 필드명 `image`. 성공 `204`. 1MB 초과·비이미지 형식은 `400 INVALID_PARAM` |
| `DELETE /api/v1/users/me/profile-image` | 삭제(기본 이미지 상태로). `204` |

---

## 6. AC 교차 참조 (판정용 요약)
| AC | 이 문서의 근거 |
|---|---|
| AC-011 | §1 persona 파라미터 + canonical 노출 + 정렬 규칙 |
| AC-012/014 | §1 빈 items / 400 `INVALID_PARAM` / 범위 초과 200 |
| AC-013 | §0 status 계산 규칙 + badges 코드 |
| AC-015~018 | §2 matchedTerms·applyUrl null·CLOSED 200·404 |
| AC-019~021 | §1 `q`(2글자 최소, 파라미터 바인딩) |
| AC-022~024 | §1 `ids`(순서 보존·누락 허용·canonical 무관) |
| AC-025~027 | §4 eventType·payload 화이트리스트·202 |
| AC-031~033 | §1 `hasAmount`·`minAmount` 파라미터 + `maxSupportAmount`·`supportAmount` 응답 노출 |
