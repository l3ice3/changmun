# screens.md

MVP 화면 명세. 각 화면이 `opportunity`의 **어떤 컬럼을 노출하는지** 정의해, 여기서 `api-spec.md`를 도출한다.
범위 = **입구(모아보기)만.** AI 비서·로그인은 후반 단계(여기 제외).

---

## 0. 공통 규칙 (한 번만 정의)

### 배지 (카드·상세 공통)
| 배지 | 출처 컬럼 | 규칙 |
|---|---|---|
| **사업자 불필요** | `target_startup_stage` ∋ `PRE_STARTUP` | 예비창업자 지원 가능 → 강조(핵심 차별점) |
| **D-day** | `application_deadline` | `deadline - 오늘`. ≤7일 = "마감임박" 강조, 지남 = 마감 |
| **상시** | `is_always_open=true` | D-day 대신 "상시모집" |
| **카테고리** | `category` | 사업화/시설·공간/교육 등 |
| **출처** | `source` | K-Startup / 기업마당 / 온통청년 (신뢰 표시) |

### 정렬 / 필터 / 페이지네이션
- 기본 정렬: **마감임박순** (`deadline ASC NULLS LAST`). 보조: 최신순(`first_seen_at`).
- 필터: 페르소나(§3) · 지역(`region`) · 카테고리(`category`) · 진행상태(open/상시/전체).
- 페이지네이션: **페이지 번호 확정**(page/size). SEO상 페이지별 고유 URL이 색인에 유리(무한스크롤 배제). 데스크톱 우선.

### status (저장 안 함, 조회 시 계산 — data-model §4)
`상시 / 모집중 / 마감` 을 deadline 기준 계산해 표시.

---

## 1. 화면 인벤토리 (MVP)

| ID | 화면 | 핵심 목적 |
|---|---|---|
| S1 | 메인 = 페르소나 진입 + 공고 리스트 | 첫 진입, 내 조건 공고만 |
| S2 | 공고 상세 | 자격·기간·원문 + 용어풀이 |
| S3 | 검색 결과 | 키워드 검색 |
| S4 | 찜 목록 (익명) | 관심 공고 모아보기 |

---

## 2. 화면별 명세

### S1. 메인 (페르소나 진입 + 리스트)
- **목적:** 진입 즉시 "내 조건 공고만". 잡코리아 신입/경력 탭과 같은 원리.
- **구성:**
  - 상단 **페르소나 탭**(§3) — 무가입, 탭 한 번.
  - 보조 필터: 지역, 카테고리, 진행상태.
  - **공고 카드 리스트** (정렬: 마감임박순).
- **카드 표시 컬럼:** `title` · `organization` · `category`(배지) · `region` · D-day(배지) · 사업자불필요(배지) · `eligibility_detail`(1줄 요약) · `source`(배지).
- **인터랙션:** 탭 전환 → 필터 → 카드 탭 → S2. (찜 버튼 → S4)
- **도출 API:** `GET /api/v1/opportunities?persona=&region=&category=&status=&sort=&page=&size=`

### S2. 공고 상세
- **목적:** 자격이 되는지 / 어떻게 신청하는지를 한 화면에. (진입장벽 제거)
- **표시 컬럼:** `title` · `organization`·`organization_type` · `category` · `region` · 기간(`application_start_date`~`application_deadline`, D-day) · `summary` · `eligibility_detail`(자격) · `target_startup_stage`/`target_audience_type`(누가 되는지 배지) · 지원 형태(`raw`의 지원내용) · **원문 링크**(`detail_url`) · **신청 링크**(`apply_url`).
- **용어풀이:** `summary`/`eligibility_detail` 내 어려운 용어 하이라이트 → 탭 시 뜻 표시(§4).
- **카피 규칙:** "신청 자격이 됩니다 / 합격은 별개"(가드레일 1). "받을 수 있어요" 금지.
- **도출 API:** `GET /api/v1/opportunities/{id}` · `GET /api/v1/glossary?terms=...`(또는 상세 응답에 용어 포함)

### S3. 검색 결과
- **목적:** 키워드로 찾기.
- **동작:** `title`(+`summary`) 부분일치(pg_trgm). 결과는 S1 카드와 동일 형식 + 필터 병행.
- **도출 API:** `GET /api/v1/opportunities?q=...`(S1과 동일 엔드포인트에 `q` 추가)

### S4. 찜 목록 (익명)
- **목적:** 관심 공고 모아보기. **무가입** — 기기 로컬(또는 익명 ID)에 저장.
- **표시:** S1 카드 형식.
- **도출 API:** MVP는 **클라이언트 로컬 저장**(API 없음). 찜한 id로 `GET /api/v1/opportunities?ids=...` 조회. (로그인·서버 동기화는 후반 — "아하 직후" 로그인 트리거와 함께)

---

## 3. 페르소나 필터 정의 (차별점 — 정확히 못 박음)

탭 → `opportunity` 컬럼 쿼리로 1:1 매핑. (data-model §3 쿼리와 일치)

| 탭 | 매핑 |
|---|---|
| **예비창업자**(사업자 없음) | `target_startup_stage` ∋ `PRE_STARTUP` |
| **대학생** | `target_audience_type` ∋ `UNIV_STUDENT` (+ 청년 연령) |
| **초기 창업자**(사업자 보유) | `target_startup_stage` ∋ `{LT_1Y,LT_2Y,LT_3Y}` |
| **전체** | 필터 없음 |

- **바이브코더:** 별도 탭 아님. "예비/초기 + 기술·R&D 카테고리" 조합으로 커버(소스 결정과 일치).
- **⚠️ 출처별 한계(솔직히 노출):** 페르소나 필터는 **K-Startup에서만 완전 작동**. 기업마당·온통청년 공고는 `target_*`가 NULL/유추라 필터에서 빠지거나 부분만 잡힘 → "전체" 탭에서는 보이되, 페르소나 탭에선 누락될 수 있음을 UX로 인지(예: "조건 미상" 별도 표기 검토).
- **✅ 탭 구성 확정:** K-Startup 실제 검색 필터가 **대상·연령·업력 3축이 독립**임을 확인 → "사업자 없음"과 "예비창업자"는 둘 다 업력=`예비창업자(PRE_STARTUP)` **같은 값**이라 **하나로 합침**. 최종 4탭 = **예비창업자 / 대학생 / 초기 창업자 / 전체**.

---

## 4. 용어 풀이 (진입장벽 제거 기능)

- **동작:** 공고 텍스트 내 사전 등재 용어를 하이라이트 → 탭 시 쉬운 설명 표시(툴팁/확장).
- **데이터:** `glossary`(term, description) 테이블(data-model). 용어 매칭은 단순 문자열 매칭부터.
- **MVP 범위:** 핵심 용어 수십 개 수기 사전부터. 자동 생성·문맥 해석은 후반.
- **도출 API:** `GET /api/v1/glossary`(전체 사전 캐싱) 또는 상세 응답에 `matched_terms` 포함.

---

## 5. MVP 제외 화면 (명시)

회원가입/로그인 · 개인화 추천 피드 · 단계 전환 안내 · 알림(이메일/푸시) · 커뮤니티/후기 · 통계 대시보드. → 비서(Phase 3)·후반.

---

## 6. 도출된 API 표면 (→ `api-spec.md` 예고)

```
GET /api/v1/opportunities      # 리스트 (persona, region, category, status, q, sort, page, size)
GET /api/v1/opportunities/{id} # 상세
GET /api/v1/opportunities?ids= # 찜 조회 (id 다건)
GET /api/v1/glossary           # 용어 사전
```
- 모든 리스트/상세는 **공개**(비로그인) → SEO(SSG/ISR) 대상.
- status·D-day·배지 플래그는 **서버가 계산해 응답에 포함**(프론트가 재계산 안 하게).
