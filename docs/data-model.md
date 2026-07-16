# data-model.md

창업 지원·투자·공모전 정보 큐레이션 서비스의 데이터 모델. **[LOCKED — v1 확정]**
**K-Startup 공식 설계서(v2.0) + 코드표 + 라이브 응답(XML/JSON 10건) 교차검증 완료본.**
Flyway 첫 마이그레이션(`V1`)의 청사진이자, Java(서빙)·Python(수집)이 공유하는 유일한 계약.

---

## 0. 설계 원칙

1. 스키마 단일 진실 = Flyway SQL. Spring은 `ddl-auto=validate` 고정.
2. 정규화·중복제거·검증은 전부 크롤러 책임. 서빙은 깨끗한 DB 가정.
3. 멱등성은 DB가 강제: `(source, external_id)` UNIQUE + UPSERT.
4. status는 저장하지 않고 조회 시 계산(§4).
5. snake_case. `user`→`app_user`.

---

## 1. K-Startup API 확정 사실 (라이브 응답으로 검증)

- **Base URL:** `https://apis.data.go.kr/B552735/kisedKstartupService01`
- **오퍼레이션:** `/getAnnouncementInformation01` (지원사업 공고)
- **인증:** `ServiceKey`(URL Encode), REST GET. **반환타입:** `returnType=json` 권장.
- **갱신주기:** 일 1회. **전체 건수:** 라이브 기준 `totalCount=28,944` → perPage=100이면 약 290페이지 순회.
- **페이지네이션:** 응답에 `totalCount / matchCount / page / perPage / currentCount` 제공 → 크롤러가 `ceil(totalCount/perPage)`만큼 순회.

### ⚠️ 실제 응답 봉투 = 설계서와 다름 (라이브 확인)

설계서 예제는 `<item><biz_pbanc_nm>값</biz_pbanc_nm></item>` 형태였으나 **실제**는 data.go.kr 자동변환 형식이다:

```xml
<results>
  <currentCount>10</currentCount>
  <data>
    <item>
      <col name="biz_pbanc_nm">2026 하반기 서울 AI 허브 ...</col>
      <col name="pbanc_sn">177976</col>
      ...
    </item>
  </data>
  <totalCount>28944</totalCount> <matchCount>28944</matchCount>
  <page>1</page> <perPage>10</perPage>
</results>
```

→ XML은 `<col name="필드">값` 속성으로 파싱해야 한다(설계서대로 짰으면 전부 빈 값). **JSON(returnType=json) 권장** — 라이브 JSON으로 검증한 실제 형태:

```json
{ "currentCount":10,
  "data":[ { "biz_pbanc_nm":"...", "pbanc_sn":177976, "supt_regin":"서울",
             "pbanc_rcpt_end_dt":"20260619", "aply_trgt":"청소년,대학생,...",
             "aply_mthd_fax_rcpt_istc":null, ... } ],
  "matchCount":28944, "page":1, "perPage":10, "totalCount":28944 }
```

JSON에서 확인된 두 가지: **`pbanc_sn`·`id`는 숫자(number)로 옴** → external_id 저장 시 문자열화. **빈 필드는 `null`**(빈 문자열 아님) → 크롤러에서 null-safe 처리.

---

## 2. 핵심 테이블: `opportunity`

| 컬럼 | 타입 | NULL | 설명 / 원본 필드 |
|---|---|---|---|
| `id` | BIGINT (identity) | NO | 내부 PK |
| `source` | VARCHAR(40) | NO | `'k-startup'` |
| `external_id` | VARCHAR(64) | NO | **`pbanc_sn`** (응답의 `<id>`는 행번호이니 사용 금지) |
| `title` | TEXT | NO | `biz_pbanc_nm` |
| `summary` | TEXT | YES | `pbanc_ctnt` |
| `category` | VARCHAR(40) | YES | 표준화 ← `supt_biz_clsfc` |
| `region` | TEXT[] | YES | 표준화 ← `supt_regin` ("서울","전국"…). **복수 시도 배열**(콤마 분리 → 각 시도 매핑) |
| `organization` | TEXT | YES | `pbanc_ntrp_nm` (기관명) |
| `organization_type` | TEXT | YES | `sprv_inst` **원문 그대로**(표시용 — 코드 표준화 안 함). 예: 공공기관·지자체·중앙부처. `organization`처럼 자유 텍스트라 길이 제약 없음 |
| `support_amount` | TEXT | YES | 공고 API엔 없음(§6). 타 출처에서 채움 |
| `target_startup_stage` | TEXT[] | YES | 표준화 ← `biz_enyy` — **차별점 필터** |
| `target_audience_type` | TEXT[] | YES | 표준화 ← `aply_trgt` ("대학생" 포함) — **차별점 필터** |
| `eligibility_detail` | TEXT | YES | `aply_trgt_ctnt` (자격 자유텍스트, 표시용) |
| `application_start_date` | DATE | YES | 파싱 ← `pbanc_rcpt_bgng_dt` (**YYYYMMDD**) |
| `application_deadline` | DATE | YES | 파싱 ← `pbanc_rcpt_end_dt` (**YYYYMMDD**) |
| `is_always_open` | BOOLEAN | NO | 상시모집 (기본 FALSE) |
| `detail_url` | TEXT | NO | `detl_pg_url` |
| `apply_url` | TEXT | YES | `biz_aply_url` → 비면 `aply_mthd_onli_rcpt_istc`(URL일 때) |
| `source_status` | VARCHAR(10) | YES | `rcrt_prgs_yn` (Y/N) |
| `dedup_group_id` | BIGINT | YES | 출처 간 동일 공고 클러스터 (null=단독). dedup 배치가 채움 |
| `is_canonical` | BOOLEAN | NO | 그룹 대표(표시용). 기본 true. K-Startup 우선 |
| `raw` | JSONB | YES | 원본 전체(biz_trgt_age·신청방법 6종·연락처·intg_* 등) |
| `first_seen_at` | TIMESTAMPTZ | NO | 최초 수집 (UPSERT 때 갱신 안 함) |
| `updated_at` | TIMESTAMPTZ | NO | 매 UPSERT 갱신 |

> `biz_trgt_age`는 라이브에서 거의 모든 공고가 "전 연령"이라 **저신호 → core에서 제외, raw에만** 보존.

### 현재 스키마 (= `V1__create_opportunity.sql` + 후속 ALTER 마이그레이션 반영)

> 아래는 **현재 효력 스키마**다. V1 원본과 ALTER 이력의 단일 진실은 `/db/migrations/` — 일부 컬럼은 V1 이후 ALTER로 타입이 바뀌었다(예: `organization_type` VARCHAR(20)→TEXT). 위 컬럼 표와 이 블록은 항상 *현재* 타입을 보여준다.

```sql
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE opportunity (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    source                  VARCHAR(40)  NOT NULL,
    external_id             VARCHAR(64)  NOT NULL,

    title                   TEXT         NOT NULL,
    summary                 TEXT,
    category                VARCHAR(40),
    region                  TEXT[],
    organization            TEXT,
    organization_type       TEXT,
    support_amount          TEXT,

    -- 타깃팅 (예비창업자·대학생 친화 필터 = 차별점)
    target_startup_stage    TEXT[],   -- {PRE_STARTUP, LT_1Y, LT_2Y, LT_3Y, LT_4Y, LT_5Y, LT_6Y, LT_7Y, LT_10Y}
    target_audience_type    TEXT[],   -- {YOUTH, UNIV_STUDENT, GENERAL, UNIVERSITY, RESEARCH_INST, COMPANY, SOLO_CREATOR}
    eligibility_detail      TEXT,

    application_start_date  DATE,
    application_deadline    DATE,
    is_always_open          BOOLEAN      NOT NULL DEFAULT FALSE,

    detail_url              TEXT         NOT NULL,
    apply_url               TEXT,

    source_status           VARCHAR(10),
    dedup_group_id          BIGINT,
    is_canonical            BOOLEAN      NOT NULL DEFAULT TRUE,
    raw                     JSONB,

    first_seen_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_opportunity_source UNIQUE (source, external_id)
);

CREATE INDEX idx_opportunity_deadline ON opportunity (application_deadline);
CREATE INDEX idx_opportunity_category ON opportunity (category);
CREATE INDEX idx_opportunity_region   ON opportunity USING gin (region);  -- TEXT[] 멤버십(@> 배열 포함)
CREATE INDEX idx_opportunity_stage    ON opportunity USING gin (target_startup_stage);
CREATE INDEX idx_opportunity_audience ON opportunity USING gin (target_audience_type);
CREATE INDEX idx_opportunity_title_trgm ON opportunity USING gin (title gin_trgm_ops);
CREATE INDEX idx_opportunity_canonical ON opportunity (is_canonical) WHERE is_canonical;  -- 서빙은 대표만 조회
CREATE INDEX idx_opportunity_dedup_grp ON opportunity (dedup_group_id);
```

> JPA 매핑: Hibernate 6는 `String[]` + `@JdbcTypeCode(SqlTypes.ARRAY)`로 별도 라이브러리 없이 배열 매핑 가능. 만약 까다로우면 `opportunity_audience` 조인 테이블로 대체 가능(트레이드오프 §9).

---

## 3. 서빙(Spring) 조회 예시

```sql
SELECT *
FROM opportunity
WHERE (:category IS NULL OR category = :category)
  AND (:region   IS NULL OR region @> ARRAY[:region]::text[])   -- 배열 포함(GIN 인덱스 활용)
  AND (:stage    IS NULL OR :stage    = ANY(target_startup_stage))   -- 'PRE_STARTUP'
  AND (:audience IS NULL OR :audience = ANY(target_audience_type))   -- 'UNIV_STUDENT'
  AND (:only_open = FALSE OR is_always_open OR application_deadline >= CURRENT_DATE OR application_deadline IS NULL)  -- 진행중·상시·기간미상(UNDATED) 포함, CLOSED만 제외 (api-spec §0)
ORDER BY application_deadline ASC NULLS LAST
LIMIT :size OFFSET :offset;
```

`stage='PRE_STARTUP'` 또는 `audience='UNIV_STUDENT'` = "예비창업자/대학생이 지원 가능한 공고만". 정부 사이트가 안 해주는 핵심 큐레이션.

---

## 4. status·D-day는 저장하지 않고 계산

```sql
-- status·dDay 산식의 유일한 정의는 api-spec §0. 이 예시는 그것을 SQL로 옮긴 것일 뿐(드리프트 금지).
CASE
  WHEN is_always_open                       THEN 'ALWAYS_OPEN'
  WHEN application_deadline IS NULL          THEN 'UNDATED'      -- 마감일 없음(상시 아님) = 기간 미상
  WHEN application_deadline >= CURRENT_DATE  THEN 'OPEN'
  ELSE                                           'CLOSED'       -- application_deadline < CURRENT_DATE
END AS status,
-- dDay는 OPEN일 때만(ALWAYS_OPEN·CLOSED·UNDATED는 null)
CASE WHEN NOT is_always_open AND application_deadline >= CURRENT_DATE
     THEN (application_deadline - CURRENT_DATE)
END AS d_day
```

(라이브 검증: 마감 지난 공고는 `rcrt_prgs_yn=N` + URL이 `bizpbanc-deadline.do`, 진행 중은 `bizpbanc-ongoing.do`로 일관됨.)

---

## 5. 한국어 검색: `pg_trgm` (기본 FTS 미사용)

`title ILIKE '%q%'` + GIN(trgm). 의미검색(pgvector)은 나중.

---

## 6. 크롤러 정규화 규칙 (라이브 데이터 기준 — 필수)

1. **봉투 파싱:** JSON 권장. XML이면 `<col name="X">` 속성으로 추출.
2. **날짜:** `YYYYMMDD`(8자리) → DATE. (설계서의 datetime 형식이 아니라 라이브 형식을 따른다)
3. **숫자 필드 문자열화:** `pbanc_sn`은 JSON에서 number(177976)로 옴 → `external_id`(VARCHAR) 저장 시 `str()`.
4. **HTML 언이스케이프:** JSON 응답에도 엔티티가 그대로 옴 — `supt_biz_clsfc`="기술개발(R&amp;D)", `intg_pbanc_biz_nm`에 `&#40;`/`&#41;`. 디코딩 후 저장.
5. **공백 정리:** 텍스트 필드에 `\r\n`·앞뒤 공백 다수(예: pbanc_ctnt 끝 줄바꿈) → `.strip()` / 표시용 정규화.
6. **category 표준화(구분자·오타 내성):** 라이브에 `·`(U+00B7)와 `ㆍ`(U+318D) 혼용, `(R&D)` 등. 구분자 정규화 후 표준값 매핑. **미지값은 '기타' + 로그**(닫힌 enum 금지).
7. **target_startup_stage[]:** `biz_enyy`("예비창업자,1년미만,…") 콤마 분리 → 표준 코드.
8. **target_audience_type[]:** `aply_trgt`("청소년,대학생,일반인,…") 콤마 분리 → 표준 코드.
9. **eligibility_detail:** `aply_trgt_ctnt` 그대로(표시용 자유텍스트).
10. **organization / organization_type:** 기관명=`pbanc_ntrp_nm`, 유형=`sprv_inst`. 둘 다 **원문 그대로 저장**(표시용 — 코드 표준화 안 함). `organization_type`은 필터 축이 아니라, 미지값을 NULL로 버리지 않고 원문 보존(예: 지자체·중앙부처). (sprv_inst는 기관명이 아니라 유형 — 라이브 확인)
11. **URL 정제:** 일부 URL 필드가 마크다운 래핑(`[bare](https://full)`)·스킴 누락·바 URL로 옴 → `[..](url)`이면 괄호 안 URL 추출, 스킴 없으면 `https://` 보정, 공백 strip.
12. **apply_url 폴백 체인:** `biz_aply_url`(라이브 전부 null) → `aply_mthd_onli_rcpt_istc`(신청 폼 URL) → `biz_gdnc_url`(안내 URL). 11번 정제 적용. (사용자 노출 1차 링크는 항상 `detail_url`)
13. **무시(raw만):** `biz_trgt_age`(거의 전 연령), `aply_mthd_eml_rcpt_istc`(암호화 블롭), `prch_cnpl_no`(연락처).
14. **external_id=`pbanc_sn`.** 응답의 `id`(1·2·3…)는 행 번호이니 절대 쓰지 말 것.
15. **필수 검증:** `pbanc_sn`·`biz_pbanc_nm` 없으면 적재 스킵.

---

## 6-B. 기업마당(Bizinfo) 소스 매핑 & 규칙 (명세 확정)

- **URL:** `https://www.bizinfo.go.kr/uss/rss/bizinfoApi.do` · GET · 인증키 `crtfcKey`
- **수집 범위:** **`searchLclasId=06`(창업) 분야만 수집.** 전 분야 수집 금지(타깃 무관 노이즈). 나머지 7분야는 MVP 제외.
- **페이지네이션:** `pageUnit`/`pageIndex`, `searchCnt`(0/생략=전체). `totCnt`로 총건수.

### 필드 매핑 (Bizinfo → opportunity)

| opportunity | Bizinfo 필드 | 비고 |
|---|---|---|
| `source` | `'bizinfo'` | |
| `external_id` | `pblancId`(=`seq`) | `PBLN_...` 문자열 |
| `title` | `pblancNm`(=`title`) | |
| `summary` | `bsnsSumryCn`(=`description`) | **`<div>` HTML 제거** |
| `category` | `pldirSportRealmLclasCodeNm`(=`lcategory`) | 8종 → 표준 매핑(§7, 느슨) |
| `region` | **`hashtags` 파싱** | 전용 필드 없음 — 해시태그에서 시도 추출(복수 가능). 라이브 RSS 키는 소문자 `hashtags`(구 명세 `hashTags`는 폴백) |
| `organization` | `jrsdInsttNm`(소관) / `excInsttNm`(수행) | |
| `eligibility_detail` | `trgetNm` | "중소기업" 등 **자유텍스트** |
| `application_start_date` / `_deadline` | `reqstBeginEndDe` 분리 | "20220727 ~ 20220930" → ` ~ ` split, 각 `YYYYMMDD` |
| `detail_url` | `pblancUrl`(=`link`) | bizinfo 상세 페이지 |
| `apply_url` | `rceptEngnHmpgUrl` | 사업신청URL(대개 빈값) |
| ~~`source_posted_at`~~ | `creatPnttm`(=`pubDate`) | **컬럼 미도입**(§2 스키마에 없음) — `raw`에 보존, 필요 시 Phase 2 |
| `raw` | 전체 | hashTags·첨부파일·문의처 등 |

### Bizinfo 전용 규칙 (필수)

1. **⚠️ JSON이 깨져 있음 → RSS(XML) 사용 권장.** `dataType=json` 응답은 값에 따옴표가 없어(`"title":착한임대인...,`) 표준 JSON 파서로 못 읽는다. **`dataType=rss`(XML)로 받아 파싱**하거나 별도 보정 필요. (K-Startup은 JSON 권장이었지만 Bizinfo는 반대)
2. **신청기간 분리:** `reqstBeginEndDe`(폴백 `reqstDt` — RSS 기본 필드)는 단일 필드 "시작 ~ 종료" → ` ~ ` 기준 split. **라이브 검증(2026-07): 실제 형식은 `2026-07-10 ~ 2026-08-10` 대시 구분** — 명세 표기(YYYYMMDD)와 달라 구분자(`-`·`.`) 허용 파싱. 한쪽만 있거나 형식 이탈 케이스 방어.
3. **region은 hashtags에서:** "창업,부산,대구,2026,중소벤처기업부"처럼 연도·분야·지역·기관이 섞여 옴. 시도 사전(§7 — 16개 시도, `전남광주` 통합 포함)과 매칭해 추출, **매칭된 시도를 모두 배열로 보존**(§2 `region TEXT[]`). 전국 사업은 시도 전체를 나열해 옴 — **시도 전체가 채워지면 `전국` 라벨도 함께 부여**(지역 필터가 `@>` 배열 포함 매칭이라 `region=전국` 요청에 잡히게). Bizinfo 지역 필터는 근사치임을 인지.
4. **HTML 제거:** `description`/`bsnsSumryCn`에 `<div>` 등 태그 포함 → strip.
5. **페르소나 필터 미지원:** 업력·연령·신청대상 enum이 없음 → `target_startup_stage`/`target_audience_type` = **NULL**. `trgetNm`은 자유텍스트라 `eligibility_detail`로만. (∴ Bizinfo 공고는 페르소나 필터에서 누락 — 4.1 원칙대로 솔직히 노출)
6. **필수 검증:** `pblancId`·`pblancNm` 없으면 스킵.

---

## 6-C. 온통청년(youthcenter) 소스 매핑 & 규칙 (실데이터 확정)

- **URL:** `https://www.youthcenter.go.kr/go/ythip/getPlcy` · GET · 인증키 `apiKeyNm` · `rtnType=json`(정상 JSON)
- **수집 범위:** **`mclsfNm`(중분류)=`창업` 슬라이스만.** 온통청년은 청년정책 전반(주거·금융·취업·복지)이고 창업은 소수(샘플 10건 중 1건) → 창업만 필터. (공간·오피스 대여는 `시설·공간·보육`으로 매핑)
- **성격:** "공고"가 아니라 "청년정책 DB". 상시 정책 많음 → 마감임박 훅 약함. 형태 혼합(보조금/바우처/공간/금리) — `plcyKywdNm`로 현금성 구분 가능.

### 필드 매핑 (온통청년 → opportunity)

| opportunity | 온통청년 필드 | 비고 |
|---|---|---|
| `source` | `'ontong-youth'` | |
| `external_id` | `plcyNo` | 20자리 숫자 문자열 |
| `title` | `plcyNm` | |
| `summary` | `plcyExplnCn`(+`plcySprtCn`) | |
| `category` | `mclsfNm` | 표준 매핑(창업→사업화 등, 느슨) |
| `region` | **`zipCd` 파싱** | 법정동 5자리 다수 → 시도 매핑(복수, best-effort) |
| `organization` | `sprvsnInstCdNm` / `operInstCdNm` | |
| `eligibility_detail` | `addAplyQlfcCndCn`(+`plcySprtCn`) | 자유텍스트 |
| `application_start/deadline` | `aplyYmd` 분리 → 폴백 `bizPrdEndYmd` | 규칙 3 폴백 체인 |
| `is_always_open` | `bizPrdEtcCn` 상시 키워드 | 규칙 3 (라이브 검증: `aplyPrdSeCd` 단독 판정은 부정확) |
| `apply_url` | `aplyUrlAddr` → `refUrlAddr1` | |
| `detail_url` | **`plcyNo`로 생성** | 응답에 상세 URL 없음 → youthcenter 상세 URL 구성 |
| `target_audience_type[]` | **`schoolCd`+연령에서 파생** | 대학생/청년 유추(아래) |
| `raw` | 전체 | 연령·소득·결혼·요건코드 등 |

### 온통청년 전용 규칙

1. **`target_audience_type` 파생(보수적):** 직접 주는 필드가 없어 유추한다. **`YOUTH`는 `sprtTrgtAgeLmtYn=Y` + `sprtTrgtMaxAge ≤ 39`일 때만** 채운다(무제한 표기 0·99 제외). **`schoolCd`→`UNIV_STUDENT` 유추는 보류** — 라이브 322건 중 311건이 동일 코드(`0049010`=제한없음)이고 공식 코드표 미확보라 신호가 약하다. 코드표 확보 시 raw에서 소급. (페르소나 탭은 `PRE_STARTUP`/`UNIV_STUDENT`/`EARLY_STAGE`뿐 → `YOUTH` 단독은 탭 필터에 쓰이지 않음. 분석·향후용으로만 보존)
2. **`zipCd` 법정동 코드 → 시도 매핑** (다수면 보류 = NULL, best-effort).
3. **기간 폴백 체인** (라이브 분포 검증 — `aplyYmd` 빈 126건이 상시36/마감204/진행31/미상51로 분리): (1) `aplyYmd` 신청기간 → ` ~ ` split (2) `bizPrdEtcCn`에 상시 키워드(연중·계속·상시·연례·반복·매년·수시) → `is_always_open=true` (3) `bizPrdEndYmd`(사업종료일, YYYYMMDD) → `application_deadline`(과거면 status 산식이 CLOSED로 계산) (4) 그 외(미정·"협약시작일로부터 N개월"·빈값) → NULL(UNDATED). **`aplyPrdSeCd` 코드 단독 판정은 부정확해 폐기.** `bizPrdEtcCn`은 자유텍스트라 날짜 파싱 대상이 아니라 상시 키워드 탐지용.
4. **`detail_url` 직접 생성** (응답에 없음 → `plcyNo`로 `…/ythPlcyTotalSearch/ythPlcyDetail/{plcyNo}`).
5. 연령·소득·결혼·요건코드는 **raw 보존**(컬럼 추가 금지).

---

## 소스 레지스트리 & 비(非)API 소스 정책

- **`source` enum (확정):** `k-startup`(메인) · `bizinfo`(창업분야만) · `ontong-youth`(창업 슬라이스만). external_id 체계가 셋 다 다름(`pbanc_sn` 숫자 / `pblancId` 문자열 / `plcyNo` 20자리) → `external_id`는 VARCHAR(64).
- **비API 소스 = 크롤링 영역 = MVP 제외:** 공공기관이어도 **API가 없고 로그인·JS로 막힌 곳**(CCEI, 전국 테크노파크, 지역기관 다수)은 민간과 동일 취급. CCEI 공식 창업 공고는 K-Startup/기업마당이 대부분 커버하므로 직접 수집 가치 낮음. 커버리지 갭이 실증되면 단일 포털 크롤러로 재검토.
- **R&D(SMTECH·과기부)·중소벤처24:** API는 있으나 기업마당과 중복 큼 → Phase 2(중복률 실측 후).

---

## 6-D. 출처 간 dedup & 페르소나 부여 (확정 설계)

배경: 중기부 스타트업 사업(예비·초기창업패키지 등)은 K-Startup·기업마당 **양쪽 동시 등록**. 단 양방향 고유분 존재(기업마당 only ≈ 소상공인·일반중소기업·지자체 / K-Startup only ≈ 대학BI·AC·경진대회) → **둘 다 수집 + dedup 필수**.

### 원칙
**오합치 > 놓침.** 다른 공고를 같다고 묶으면 공고가 숨음(가드레일 2 위반) → 임계값은 보수적으로. 비파괴(원본 레코드 유지, 그룹만 해제 가능).

### dedup 파이프라인 (수집 후 배치 1패스 — 크롤러 책임)
1. **정규화:** `norm_title` = 제목 − `[지역]` 접두 − 연도 − 차수(N차) − 상투어("모집 공고","참여기업","시행계획") + 공백·구분자 통일. `norm_org` = 기관명 약어사전 정규화(중기부=중소벤처기업부 등) + 법인격 접두 제거((재)·(주)·재단법인 등 — 2026-07-16 튜닝, 소스 간 표기차 흡수).
2. **블로킹:** `application_deadline` 동일 그룹 내에서만 쌍 비교(N² 방지).
3. **스코어링:** `0.6·similarity(norm_title) [pg_trgm] + 0.25·기관일치 + 0.15·기간일치` → **≥ 0.85**만 동일 판정. (판정 정밀화 — 2026-07-16 튜닝, §11-8 절차·전수 검수 오합치 0: **기관일치** = 후보 집합 교집합 — 같은 공고를 소스마다 소관부처/수행기관으로 다르게 표기(해양수산부 vs 해양수산과학기술진흥원)하므로 organization + raw의 소관·수행 필드를 모두 후보로 / **기간일치** = 시작일 ±1일 — 출처 간 등록 시차 라이브 관찰, 마감일은 블로킹이 동일 강제)
4. **그룹핑:** 동일 판정 쌍 Union-Find → `dedup_group_id` 부여(단독 공고는 NULL).
5. **canonical 선정:** 그룹 내 **K-Startup 우선**(페르소나 필드 풍부) → `is_canonical=true`. 동순위면 정보량(채워진 컬럼 수) 많은 쪽.
- **서빙:** 리스트/검색은 `WHERE is_canonical = true`. 상세에서 "다른 출처에서도 게재" 링크로 그룹 내 나머지 노출 가능(선택).

### 페르소나 부여 3단계 폭포 (신호 강한 순)
1. **구조화(직접):** K-Startup `biz_enyy`/`aply_trgt` → 표준 코드(§7). *최고 신뢰.*
2. **상속(dedup 보너스):** dedup 그룹에 K-Startup 레코드가 있으면 → **그룹 전체가 canonical(K-Startup)의 `target_*`를 공유.** 기업마당 창업분야 상당수가 추가 작업 없이 해결.
3. **텍스트 추출(잔여분):** 기업마당 only 레코드는 `trgetNm`·제목·`bsnsSumryCn`에 **보수적 키워드 규칙**("예비창업"→PRE_STARTUP, "대학생"→UNIV_STUDENT, "N년 미만"→LT_NY). 확실한 패턴만 채움. (LLM 추출은 규칙 정밀도 부족 판명 시 후순위)
- **신호 없음 → NULL 유지 = "조건 미상" 표기**(screens.md). 억지로 채우지 않음(가드레일 2).
- 효과: 페르소나 탭은 `target_*` 쿼리이므로, 데이터가 채워지는 만큼 출처 무관하게 자동 작동(업력별 노출 차등도 별도 로직 불필요).

---

## 7. 표준 분류 → `taxonomy.md`

### category — K-Startup 실제 검색 필터 11종 (라벨 확정)

K-Startup 검색 UI의 실제 지원분야 = **사업화 · 기술개발(R&D) · 시설ㆍ공간ㆍ보육 · 멘토링ㆍ컨설팅ㆍ교육 · 글로벌 · 인력 · 융자ㆍ보증 · 행사ㆍ네트워크 · 창업교육 · 판로ㆍ해외진출 · 정책자금** (11종).
- 코드표(통합공고)보다 실제 UI가 정답 → 위 11종을 표준으로 채택. 미지값은 `기타`.
- 이전 추정 대비 교정: `융자`→`융자ㆍ보증`, `멘토링ㆍ컨설팅`→`멘토링ㆍ컨설팅ㆍ교육`, `정책자금` 신규 추가(융자ㆍ보증과 별개). `창업교육`·`멘토링ㆍ컨설팅ㆍ교육`은 둘 다 존재(유지).
- 공고 API `supt_biz_clsfc`는 구분자(ㆍ/·)·HTML 엔티티 혼재 → 정규화 시 흡수.

표준 category = 위 11종 + `기타`.

**Bizinfo 분야(8종) → 표준 매핑 (느슨, 1:1 아님):** 금융→융자 · 기술→기술개발(R&D) · 인력→인력 · 수출→판로·해외진출 · 내수→판로·해외진출 · 창업→사업화 · 경영→기타 · 기타→기타. (체계가 달라 손실 있음 — 원본값은 raw 보존, 매핑은 판단 필요)

**온통청년 `mclsfNm` → 표준 매핑:** 창업→사업화, (공간/오피스 대여)→시설·공간·보육 등 느슨 매핑. 비창업 슬라이스는 애초 수집 안 함(6-C).

### target_startup_stage — `biz_enyy`

예비창업자→PRE_STARTUP, 1년미만→LT_1Y, 2년미만→LT_2Y, 3년미만→LT_3Y, 4년미만→LT_4Y, 5년미만→LT_5Y, 6년미만→LT_6Y, 7년미만→LT_7Y, 10년미만→LT_10Y. (4·6년 미만은 라이브 K-Startup `biz_enyy`에서 관찰돼 추가 — 2026-06-18)

### target_audience_type — `aply_trgt`

청소년→YOUTH, 대학생→UNIV_STUDENT, 일반인→GENERAL, 대학→UNIVERSITY, 연구기관→RESEARCH_INST, 일반기업→COMPANY, 1인 창조기업→SOLO_CREATOR.

> 출처별 원천이 다름: K-Startup=`aply_trgt` 직접 / 온통청년=`schoolCd`+연령에서 **유추** / Bizinfo=없음(NULL). 같은 컬럼으로 정규화하는 게 크롤러의 핵심 일.

### organization_type — `sprv_inst` (원문, 표준화 안 함)

**표시용**이라 `sprv_inst` 원문을 그대로 저장한다(코드 매핑·표준 enum 폐기). 필터 축이 아니므로 미지값을 NULL로 버리지 않는다 — 예: 공공기관·지자체·중앙부처가 그대로 들어온다. (이전: PUBLIC/PRIVATE/EDUCATION 코드 매핑 → 표시용엔 손실만 커서 폐기)

### region — `supt_regin`

`전국` + **16개 시도** + `해외` (2026-07-15 개정 — 행정구역 통합 반영). 라이브는 이미 짧은 형태("서울","경남","부산","인천")로 옴 → 풀네임("서울특별시") 들어올 경우만 매핑. **컬럼은 `TEXT[]` — 콤마 복수 지역을 분리해 각 시도로 매핑한 배열로 저장**(예: "서울,경기" → `{서울,경기}`). 단일 컬럼이 아니라 배열이므로 복수 지역이 어느 한쪽 필터에서도 누락되지 않는다. 인식 0개면 NULL(미지 토큰은 로그). 온통청년은 `zipCd` 복수 → 인식된 시도 전부 배열로(이전엔 복수면 보류).

**전남광주 통합 (2026 행정구역 개편):** 광주광역시+전라남도가 `전남광주통합특별시`로 통합 — 표준값은 **`전남광주`** 하나. 세 소스 모두 신·구 표기가 혼재하므로(라이브 실증: K-Startup `supt_regin=전남광주` / Bizinfo hashtags `전남광주` / 온통청년 신규 법정동 프리픽스 `12`), 입력 정규화는 **`광주`·`전남`·구 풀네임(`광주광역시`·`전라남도`)·`전남광주`·`전남광주통합특별시` 전부 → `전남광주`**, 법정동 프리픽스는 **`12`(신)·`29`(구 광주)·`46`(구 전남) → `전남광주`**. 기존 적재분의 `광주`/`전남` 값은 데이터 마이그레이션으로 일괄 이관(치환 후 배열 중복 제거).

---

## 8. 인증·북마크 (구현 — 로그인 In-Scope 확장, 팀 3인 합의)

> 원래 Phase 2였으나 **로그인을 In-Scope로 확장**(팀 3인 합의)해 구현한다. 아래 스키마는 그대로 유효하되, 마이그레이션 파일명은 `V2__`가 이미 점유(glossary·event_log)라 **타임스탬프 버전**으로 나눠 적재한다:
> - `app_user` → `V20260630_1000__create_app_user.sql` (로그인 기반, 구현됨).
> - `bookmark` → 서버측 찜 동기화 기능 PR에서 추가(opportunity FK가 기존 테스트 TRUNCATE와 얽혀 함께 처리).
>
> **PII 최소 수집**(절대규칙 6 취지): 이메일 + provider 식별자만 저장. 액세스 토큰·소셜 프로필 등 미수집. 소셜 제공자별 1행(계정 연결은 후속).
>
> **프로필 이미지 컬럼 추가**(2026-07-08, 팀 3인 합의 — 마이페이지 스코프 확장): `profile_image BYTEA` + `profile_image_type VARCHAR(30)` — `V20260708_1000__add_profile_image_to_app_user.sql`. 사용자가 **직접 업로드**한 이미지(1MB 이하, JPEG/PNG/WebP)만 저장 — 소셜 프로필 사진을 가져오지 않는 원칙은 유지. 1MB 제한이라 별도 스토리지 없이 DB 저장, 엔티티에 매핑하지 않고(native 조회) 로그인 경로가 바이너리를 싣지 않게 한다.

```sql
CREATE TABLE app_user (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email        VARCHAR(255) NOT NULL,
    provider     VARCHAR(40)  NOT NULL,
    provider_uid VARCHAR(200) NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_provider UNIQUE (provider, provider_uid)
);

CREATE TABLE bookmark (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES app_user(id)    ON DELETE CASCADE,
    opportunity_id BIGINT NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bookmark UNIQUE (user_id, opportunity_id)
);
CREATE INDEX idx_bookmark_user ON bookmark (user_id);
```

---

## 9. 주요 설계 결정 & 트레이드오프

| 결정 | 이유 | 트레이드오프 |
|---|---|---|
| `(source, external_id)` UNIQUE + UPSERT | 멱등성 DB 강제 | — |
| status 미저장, 조회 시 계산 | 일 1회 갱신이라 저장값 stale | 조회마다 계산(무시 가능) |
| stage·audience TEXT[] + GIN | 예비창업자/대학생 필터 = 핵심 차별점 | 배열 JPA 매핑 한 꺼풀 (싫으면 조인테이블) |
| category 열린 enum(+기타) | 공고 API가 코드표보다 값 많음(판로·해외진출) | 미지값 모니터링 필요 |
| biz_trgt_age 제외 | 라이브상 거의 전 연령(저신호) | 나중에 필요하면 raw에서 복구 |
| support_amount nullable | 공고 API에 없음 | K-Startup 단독 적재 시 대개 NULL |
| 날짜 nullable + is_always_open | 상시/미정 존재 | 정렬 NULLS LAST |
| raw JSONB 보존 | 매핑 버그 재처리·미사용 필드 보관 | 용량 증가 |

---

## 10. 검증 로그 & 남은 확인

**라이브 10건(XML+JSON) 교차검증 완료 — 스키마 LOCKED.** 확인된 사항:
- 봉투/타입: JSON `{data:[...], totalCount, page, perPage}`, `pbanc_sn` 숫자, 빈 필드 `null`. ✔
- 날짜: 전부 `YYYYMMDD`(예: 20260619). ✔
- category 실제값 집합: 사업화/창업교육/행사ㆍ네트워크/기술개발(R&D)/판로ㆍ해외진출 (구분자 `ㆍ`·HTML 엔티티 `&amp;` 확인). ✔ → 열린 enum 처리 정당화.
- target: `biz_enyy`·`aply_trgt` 어휘 고정 확인. `biz_trgt_age`는 10건 중 8건 "전 연령" → 저신호 확정. ✔
- 차별점 검증: 10건 중 `예비창업자` 포함 6건(서울AI허브·서울바이오허브·KAIST 외) → PRE_STARTUP 필터 유효. ✔
- 마감 상태: `rcrt_prgs_yn=N` 1건(OpenAI, 마감 20260605)이 deadline·URL(`bizpbanc-deadline.do`)과 일치. ✔

**소스 명세 확정:** K-Startup(라이브 10건) ✔ / 기업마당 Bizinfo(공식 명세) ✔ / 온통청년(실데이터 10건) ✔ — **셋 다 `opportunity` 스키마로 변경 없이 수용**(설계 3회 검증). 비API 소스(CCEI·테크노파크 등)는 크롤링 영역으로 MVP 제외.

**남은 확인(스키마 변경 아님):**
1. 더 많은 페이지로 각 소스의 category·지역·대상 값 전체 집합 확정.
2. `getBusinessInformation01`의 `biz_supt_bdgt_info`로 `support_amount` 보강 여부.
3. ~~출처 간 dedup~~ → **§6-D로 확정 설계 완료**(스코어링 임계 0.85·canonical=K-Startup 우선·페르소나 3단계). 남은 건 임계값 튜닝(실데이터로 오합치율 검증).
4. R&D(SMTECH·과기부)·중소벤처24: 기업마당과 중복 가능성 높음 → 중복률 실측 후 Phase 2 결정.
5. `screens.md`에서 노출 컬럼 확정 → eligibility_detail·apply_url·organization_type 표시 범위.
