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
| `support_amount` | TEXT | YES | 지원금 **원문 표기** 보존("최대 1.5억원" 등 — §6-E 추출 시 함께 채움). K-Startup 공고 API엔 필드 없음(§6) |
| `max_support_amount` | BIGINT | YES | **기업당/1인당 최대 지원액(원)** — 본문 보수 추출(§6-E). 사용자 훅·마케팅 지표. 신호 없으면 NULL |
| `total_program_budget` | BIGINT | YES | **사업 전체 예산(원)** — 본문 보수 추출(§6-E). 규모 비교·집계용. 신호 없으면 NULL |
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
| `is_canonical` | BOOLEAN | NO | 그룹 대표(표시용). 기본 true — **민간은 `false`로 적재**(승인 시 확정, §6-F 규칙 3·8). 선정 순위는 **노출 가능성 → 출처(K-Startup 우선) → 정보량 → id**(§6-D 규칙 5) |
| `review_status` | VARCHAR(10) | YES | **민간 소스 검수 상태**(FR-010, §6-F): `NULL`=공공 소스(검수 불요 — 기존 행 백필 불요) / `pending`·`approved`·`rejected`=민간. 서빙은 NULL·approved만. **NULL 허용은 공공 3소스로 CHECK 제약이 한정**(민간·신규 source는 상태 필수 — §6-F 규칙 2). **마이그레이션 예정**(§6-F ALTER — bookmark 선례처럼 문서 선행) |
| `raw` | JSONB | YES | 원본 전체(biz_trgt_age·신청방법 6종·연락처·intg_* 등). **민간 소스는 예외 — 본문 전문 미수집**(§6-F) |
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
    max_support_amount      BIGINT,   -- 기업당 최대 지원액(원) — §6-E 보수 추출, V20260718 추가
    total_program_budget    BIGINT,   -- 사업 전체 예산(원) — §6-E 보수 추출, V20260718 추가

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
  AND (review_status IS NULL OR review_status = 'approved')   -- 민간은 검수 승인분만 — 모든 서빙 경로(ids=·stats 집계 포함) 공통 불변식 (FR-010, §6-F)
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

- **`source` enum (확정):** 공공 `k-startup`(메인) · `bizinfo`(창업분야만) · `ontong-youth`(창업 슬라이스만) + **민간 화이트리스트(FR-010 파일럿)** `asan-nanum` · `kakao-impact` · `sopoong` · `kb-innovation-hub`. external_id 체계가 소스마다 다름(`pbanc_sn` 숫자 / `pblancId` 문자열 / `plcyNo` 20자리 / 민간은 §6-F) → `external_id`는 VARCHAR(64).
- **비API 공공 소스 = 크롤링 영역 = 제외 유지:** 공공기관이어도 **API가 없고 로그인·JS로 막힌 곳**(CCEI, 전국 테크노파크, 지역기관 다수)은 민간과 동일 취급. CCEI 공식 창업 공고는 K-Startup/기업마당이 대부분 커버하므로 직접 수집 가치 낮음. 커버리지 갭이 실증되면 편입 체크리스트로 재검토.
- **R&D(SMTECH·과기부)·중소벤처24:** API는 있으나 기업마당과 중복 큼 → Phase 2(중복률 실측 후).

### 민간 소스 편입 체크리스트 (FR-010 — 신규 소스는 전 항목 통과 + 3인 합의 필수)

1. **robots.txt가 수집 경로를 허용**한다 (확인 일자·내용 기록. AI봇 차단 등 부분 신호도 기록해 판단 근거로).
2. **정적 HTML 또는 RSS로 수집 가능** (Tier 1 — 헤드리스 브라우저 필요하면 편입 불가, Tier 2·3은 별도 합의).
3. **이용약관에 수집 금지 조항 없음** (검토 기록 남김. robots에 서면 허가 요구 등 명시가 있으면 허가 없이 편입 불가).
4. **자체 재원 공고** — 정부사업 위탁운영(운영사) 공고는 공공 3종에 이미 실림 → 표본으로 비커버(고유분) 확인.
5. **타깃 적합**(예비·극초기·대학생) + 공고 빈도가 크롤러 유지비를 정당화.
6. **1소스 1파일 구현 + 실응답 fixture 테스트** (ingest 규칙).
- **운영 중 차단(403/429) 관측 시 즉시 해당 소스 수집 중단** — 우회 금지, 재개는 원인 확인 후.
- **집계 사이트(THE VC·올콘·링커리어·벤처스퀘어 등)는 크롤링 영구 금지**(저작권법 §93 DB권 — 채용공고 크롤링 소송에서 침해 인정된 구조). 사람의 소스 발굴 도구로만 사용.

### 민간 소스 실사 이력 (2026-07-26, 2차에 걸쳐 후보 10곳)

| 소스 | robots | 정적 | 판정 |
|---|---|---|---|
| 아산나눔재단 | 전면 허용+sitemap | ✅ `/notice` | **편입(파일럿)** — 타깃 적합 최상 |
| 카카오임팩트 | 파일 없음(관례상 허용) | ✅ `/news` | **편입(파일럿)** |
| 소풍벤처스 | `/oauth2/`만 차단 | ✅ `/contents` | **편입(파일럿)** |
| KB이노베이션허브 | 전면 허용+sitemap | ✅ | **편입(파일럿)** — 연 1~2회로 빈도 낮음 |
| 디캠프 | 일반 봇 허용, AI봇 전면 차단+`ai-train=no` | 실사 403 | **보류** — 차단 의사 관측, 재확인 후 판단 |
| 스파크랩 | 전면 허용 | 게시판 없음(뉴스레터만) | **크롤링 부적합** — 뉴스레터 구독 채널로. 수동 등록하려면 **`source` enum 편입이 선행**(§6-F 규칙 11) — 현재 미편입이므로 백로그 |
| 프라이머 | **서면 허가 요구 명시** | — | **불가** — 허가 요청이 선행 |
| 언더독스 | **전면 금지(`Disallow: /`)** | — | **불가** |
| 신한 스퀘어브릿지 | 전면 허용 | ❌ JS 렌더링 | Tier 2 후보(보류) |
| 브라이언임팩트 | 전면 허용 | ✅ 단 공고 게시판 없음(프로그램 페이지만) | **백로그** — 페이지 변경 감지 방식 필요 |

> 미실사 백로그: 롯데벤처스(L-CAMP) · 한화 드림플러스 · 포스코 체인지업그라운드(공공 포털 중복 의심) · 현대 제로원(크리에이터 공모 — 적합 낮음) 등 — 편입 검토 시 위 체크리스트부터.

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
5. **canonical 선정:** **① 노출 가능성 → ② 출처(K-Startup 우선 — 페르소나 필드 풍부) → ③ 정보량(채워진 컬럼 수) → ④ id 안정 정렬** 순으로 뽑아 `is_canonical=true`. **민간 소스(§6-F)는 `approved`만 dedup 대상이며 출처 순위 최하위**(K-Startup > 기타 공공 > 민간 — 어디까지나 ②의 기준이다).
   - **①이 최우선인 이유(AC-010)**: 마감된 레코드가 노출 가능한 공고를 canonical 자리에서 가리면 기본 `status=open` 목록에서 **그룹 전체가 사라진다**. 노출 순위는 `진행중·상시(2) > 기간미상 UNDATED(1) > 마감 CLOSED(0)` — UNDATED가 CLOSED보다 위인 것은 api-spec §0이 UNDATED를 기본 노출에 포함하기 때문.
   - 구현: `apps/ingest`의 `_pick_canonical`(`dedup/engine.py`)이 이 순서 그대로다.
- **서빙:** 리스트/검색은 `WHERE is_canonical = true`. 상세에서 "다른 출처에서도 게재" 링크로 그룹 내 나머지 노출 가능(선택).

### 페르소나 부여 3단계 폭포 (신호 강한 순)
1. **구조화(직접):** K-Startup `biz_enyy`/`aply_trgt` → 표준 코드(§7). *최고 신뢰.*
2. **상속(dedup 보너스):** dedup 그룹에 K-Startup 레코드가 있으면 → **그룹 전체가 canonical(K-Startup)의 `target_*`를 공유.** 기업마당 창업분야 상당수가 추가 작업 없이 해결.
3. **텍스트 추출(잔여분):** 기업마당 only 레코드는 `trgetNm`·제목·`bsnsSumryCn`에 **보수적 키워드 규칙**("예비창업"→PRE_STARTUP, "대학생"→UNIV_STUDENT, "N년 미만"→LT_NY). 확실한 패턴만 채움. (LLM 추출은 규칙 정밀도 부족 판명 시 후순위)
- **신호 없음 → NULL 유지 = "조건 미상" 표기**(screens.md). 억지로 채우지 않음(가드레일 2).
- 효과: 페르소나 탭은 `target_*` 쿼리이므로, 데이터가 채워지는 만큼 출처 무관하게 자동 작동(업력별 노출 차등도 별도 로직 불필요).

---

## 6-E. 지원금 규모 추출 (FR-008 — 데이터 파트)

> 목적: 공고별 "최대 얼마 규모" 훅 + "확인된 지원 규모 총합" 마케팅 지표(PRD FR-008).
> **원칙: 정밀도 > 채움률.** 틀린 금액 표시가 미표시보다 나쁘다 — 확실한 패턴만 추출, 아니면 NULL.

### 추출 규칙
1. **입력**: `summary`(전 소스 공통 — 각 소스의 본문 필드가 이미 여기 매핑됨). 결과는 결정적(같은 본문 → 같은 값).
2. **컬럼 구분은 수식어로**:
   - `max_support_amount` ← "기업당·팀당·과제당·개사당·1인당" 또는 지원 문맥의 "최대" + 금액
   - `total_program_budget` ← "총 사업비·총 예산·총 X원 규모" + 금액
3. **단위 변환**: 억=10⁸ · 천만=10⁷ · 백만=10⁶ · 만=10⁴ (원 단위 BIGINT). 소수점("1.5억")·조합("1억 5천만원")·콤마 허용. **"X백만원" 단위 표기(예: 50백만원)는 지원 문맥일 때만** 변환.
4. **제외(오인 방지 — AC-029)**: 자격 조건 문맥("매출액 X 이하/이상/미만"·"X 이상 투자 유치") · **융자성 문서 통째 제외** — 본문에 상환·융자·대출·보증('보증금' 제외)이 등장하면 추출하지 않는다(창 기반 배제를 빠져나간 실사례를 전수 검수로 확인, 2026-07-18. 혼합 문서는 포기 — 오추출 금지가 우선) · **"N년간/N개년 최대 X원"** — 프로그램 다년 예산이지 기업당 지원금이 아님(캠퍼스타운 실사례).
5. **범위 표현("5천만~1억원")**: 상한을 `max_support_amount`로. **한계값**: 10만원 미만·1조 초과 버림, 기업당은 20억 초과 버림(실존 최대급=팁스 15억 — 그 이상은 "4년간 최대 80억" 같은 사업단 예산의 오인). bare "총 X원"은 개인 수령 총액 오분류가 확인돼 **명시 표현(총 사업비·총 예산·총 지원 규모)만** 총액으로 인정.
6. **dedup 그룹 상속**: 그룹 내 추출값을 페르소나 상속과 같은 단계에서 공유(NULL인 멤버만 채움 — 자체 추출값 우선). **예외 — `support_amount` 원문은 max의 출처를 따른다**: `max_support_amount`를 상속받는 멤버(자체 max NULL)는 자체 원문(총예산 문구일 수 있음)을 유지하지 않고 donor의 원문으로 덮는다 — 총예산 문구가 상속된 max와 함께 기업당 지원액처럼 서빙되는 것 방지(Codex #69, api-spec §1). K-Startup은 본문에 금액이 없어(첨부파일 구조) 교차 소스 상속이 주 채움 경로.
7. **원문 보존**: 추출에 사용한 원문 표현을 `support_amount`(TEXT)에 저장(표시·검수용). 추출 실패 시 세 컬럼 모두 건드리지 않음(NULL 유지).

### 커버리지 현실 (라이브 실측 2026-07-18)
진행중 공고 기준 채움 가능: 기업마당 ~18% · 온통청년 ~8% · **K-Startup ~0.6%**(금액이 첨부 HWP에만 있음) — 전체 약 5%. K-Startup 첨부 추출은 **크롤링 금지 원칙과 충돌 → Phase 2**(이 실측이 "커버리지 갭 실증 시 재검토" 조건 충족). 민간 수집(§6-F) 결합 시 같은 파이프라인으로 총액 지표 성장.

---

## 6-F. 민간 소스 공통 규칙 (FR-010 — 하이브리드) 【2026-07-26 신설 — 3인 합의 대상】

> 파일럿 4소스: `asan-nanum` · `kakao-impact` · `sopoong` · `kb-innovation-hub` (편입 근거·실사는 소스 레지스트리). 소스별 상세 필드 매핑은 구현 시 각 소스 파일 + 본 절에 확정 기록(§6-B·6-C 선례).

### 스키마 변경 (Flyway — 이 문서 합의 후 마이그레이션 추가)

```sql
-- V{타임스탬프}__add_review_status.sql
ALTER TABLE opportunity ADD COLUMN review_status VARCHAR(10);
-- NULL = 공공 소스(검수 불요 — 기존 행 백필 불요, 공공 경로 의미 무변경)
-- 'pending' | 'approved' | 'rejected' = 민간 소스(FR-010)

-- source는 레지스트리에 편입된 7종만. 오타·미편입 값(예: 'sparklabs')이 들어오면
-- 목록엔 뜨는데 그 값으로 source 필터를 걸면 api-spec enum 검증에서 400이 나는
-- 계약 불일치가 생긴다(규칙 11이 절차로 막는 것을 DB로도 막는다).
ALTER TABLE opportunity ADD CONSTRAINT ck_opportunity_source CHECK (
    source IN ('k-startup', 'bizinfo', 'ontong-youth',
               'asan-nanum', 'kakao-impact', 'sopoong', 'kb-innovation-hub')
);

-- NULL 허용은 공공 3소스 화이트리스트에만. 그 밖의 모든 source는 세 상태 중 하나가 필수다.
-- IS NOT NULL을 명시적으로 AND 하는 이유: CHECK는 식이 NULL이면 통과시키는데
-- `NULL IN (...)`는 false가 아니라 NULL이라, 이 가드가 없으면 정작 막으려던 "상태 누락" 행이 통과한다.
ALTER TABLE opportunity ADD CONSTRAINT ck_opportunity_review_status CHECK (
    CASE WHEN source IN ('k-startup', 'bizinfo', 'ontong-youth')
         THEN review_status IS NULL
         ELSE review_status IS NOT NULL
              AND review_status IN ('pending', 'approved', 'rejected')
    END
);

CREATE INDEX idx_opportunity_review_pending ON opportunity (review_status) WHERE review_status = 'pending';  -- 검수 큐 조회용
```

**마이그레이션 안전성 (로컬 실측 2026-07-26)**: 적재된 29,874행의 `source`는 `k-startup`(29,452)·`ontong-youth`(325)·`bizinfo`(97) 셋뿐 — 전부 편입 7종 안에 있고(`ck_opportunity_source` 통과) THEN 분기(`review_status IS NULL`)를 만족하므로 **두 CHECK 추가 시 기존 행 위반 0건, 백필 불요**. 제약 추가는 테이블 전체 스캔 + ACCESS EXCLUSIVE 락이지만 3만 행 규모라 순간이다.

### 규칙

1. **서빙 불변식**: 리스트·검색·상세·`ids=`·**홈 지표(`/opportunities/stats` 집계 3종)**·**상세 응답의 `otherSources`(dedup 그룹 형제 조회)** — **전 경로**에 `(review_status IS NULL OR review_status = 'approved')` — §3 예시 반영. `pending`·`rejected`는 어떤 경로로도 노출 금지이며 **카운트에도 잡히지 않고, 승인된 공고의 형제 목록에도 실리지 않는다** (AC-035).
   > `otherSources`는 최상위 조회가 아니라 **승인된 공고 안에 중첩돼 나가는 노출**이라 놓치기 쉽다 — 현행 `findGroupSiblings`는 `dedup_group_id`만 보고 그룹 전체를 가져오므로, 필터를 빠뜨리면 상세를 404로 막아도 민간 미검수 행의 `source`·`detailUrl`이 공공 공고 응답에 실려 나간다.
2. **NULL은 공공 전용 — DB가 강제한다(fail-closed)**: 위 `ck_opportunity_review_status`가 NULL 허용을 공공 3소스로 한정한다. 민간 4소스든 뉴스레터 수동 등록(PRD FR-010)이든 신규 수집기든, **상태를 빠뜨린 행은 INSERT 자체가 실패**한다 — "상태 미지정 = NULL = 즉시 공개"로 검수 게이트가 통째로 우회되는 사고를 막기 위함(AC-034). 대가로 **신규 공공 소스 편입 시 이 제약도 함께 ALTER**해야 한다(의도된 마찰 — 새 소스는 검수 대상인지 명시적으로 판정하고 넘어가라).
3. **적재**: 민간 크롤러는 항상 `review_status='pending'` + `is_canonical=false`로 INSERT(canonical은 승인 시점에 확정 — 규칙 7·8). 재수집 UPSERT는 **내용 필드만 갱신**하고 `first_seen_at`은 불변.
4. **재수집 시 `review_status` 전이 — 승인은 "그 시점 내용"에 대한 승인이다**: 상태별로 다르게 처리한다.
   - `rejected` → **불변**(반려 공고가 재수집으로 부활 금지 — AC-036).
   - `pending` → **불변**(검수 대기 유지 — 내용만 최신화).
   - `approved` → **핵심 필드가 바뀌면 `pending`으로 되돌린다**(= 재검수 전까지 노출 중단, AC-039). 핵심 필드 = `application_deadline`·`application_start_date`·`title`·`support_amount`(및 파생 금액 2종). 그 밖의 필드(요약·기관 표기 등) 변경은 승인을 유지한다.

   **왜**: 검수 게이트의 존재 이유가 "기계 파싱을 사람이 보증한다"인데, 최초 승인만 검수하면 **이후의 마감일 변경·오파싱이 무검증으로 그대로 노출**된다 — 가드레일 2(마감일 정확성)가 승인 이후 구간에서 통째로 비는 셈. 되돌림은 재검수까지 며칠 미노출을 감수하는 선택이며, 그 반대(틀린 마감일 노출)가 더 큰 해라는 판단이다. 민간 공고량이 소스당 연 1~5건이라 재검수 부담도 작다.
   **비교 기준은 DB 컬럼이 아니라 수집 스냅샷이다**: 강등 판정은 **`raw`에 보존된 직전 수집 스냅샷의 해당 필드 vs 새 파싱 값**을 비교한다(규칙 5의 raw가 제목·기간·금액 표기 등 사실 필드를 갖고 있으므로 스키마 추가 없음). **DB 컬럼과 비교하면 안 된다** — 승인 후 컬럼은 수집값이 아닌 값을 담을 수 있기 때문이다:
   - `support_amount`·금액 2종은 **dedup 그룹 상속(§6-E 규칙 6)으로 donor 값이 덮여 있을 수 있다.** 민간 페이지를 다시 파싱하면 자체값(또는 NULL)이 나오므로 donor 값과 항상 달라진다.
   - `target_*`는 검수 CLI의 **수동 태깅** 결과다(규칙 9).

   그대로 DB 비교를 하면 **원문이 한 글자도 안 바뀌었는데 매 배치마다 "핵심 필드 변경"으로 판정돼 강등된다** — 사람이 재승인해도 다음 배치가 또 강등시키는 무한 루프가 되어 해당 공고가 사실상 영구 미노출이 된다.
   **강등도 canonical 재선정과 원자적이다**: 강등되는 행이 그룹의 canonical이었다면, **같은 트랜잭션에서 그룹의 남은 멤버(`approved`·공공) 중 canonical을 다시 뽑는다**(우선순위는 규칙 7). 남은 멤버가 없으면 그룹 전체가 미노출로 남는다(전부 검수 대기이므로 정상). 왜: 강등된 행은 규칙 7에 따라 dedup 대상에서 빠지는데 남은 멤버는 `is_canonical=false`인 채라, 재선정하지 않으면 **승인돼 있던 공고가 그룹째 리스트·검색에서 사라진다**(AC-039).
5. **raw 정책 (절대규칙 3의 민간 적용)**: 공고 **본문 전문을 수집·저장하지 않는다** — 민간 공고문은 공공누리 없는 저작물(전재 리스크). raw에는 목록·상세에서 추출한 **사실 필드**(제목·기관·기간·금액 표기·대상 문구)·원문 URL·수집 메타만. "원본 그대로" 원칙은 *수집한 것*에 한해 유지(수집한 필드의 가공·요약 금지는 동일).
6. **수집 기술 Tier 1 한정 + 예절 의무**: requests+BeautifulSoup4+feedparser만. 매 실행 robots.txt 확인 · UA `changmun-bot/1.0 (+https://changmun.com/bot)` · 요청 간 ≥1초 · 일 1회. robots 불허·403/429 → 해당 소스 스킵+리포트, 우회 금지 (AC-037).
7. **dedup 참여**: `approved`와 공공(NULL)만 비교 대상 — 검수 전 데이터가 canonical 결정을 오염시키지 않게. canonical 선정은 **§6-D 규칙 5를 그대로 따른다 — ① 노출 가능성 → ② 출처(K-Startup > 기타 공공 > **민간**) → ③ 정보량 → ④ id**. 민간이 낮은 건 ②뿐이므로, **마감된 공공 건과 진행 중인 승인 민간 건이 같은 그룹이면 민간이 canonical이 된다**(①이 먼저다). 출처 순위를 앞에 두면 마감 공공 행이 대표가 되어 기본 `status=open` 목록에서 그룹째 사라진다(AC-010 위반).
8. **승인은 canonical 확정과 원자적이다**: 민간 행은 `is_canonical=false`로 적재되므로(규칙 3), 승인 CLI는 **한 트랜잭션 안에서** ① 해당 건의 dedup 판정(§6-D) → ② `dedup_group_id`·`is_canonical` 확정 → ③ `review_status='approved'` 를 **함께 커밋**한다. 단독이면 `is_canonical=true`. 그룹에 속하면 **규칙 7의 순위로 그룹 canonical을 재선정**한다 — 출처만 보고 "공공과 중복이면 민간은 무조건 false"로 처리하면 안 된다. 마감된 공공 건과 진행 중인 승인 민간 건이 중복일 때 민간이 대표가 되어야 그룹이 기본 `status=open` 목록에 남는다(①이 ②보다 먼저 — AC-010·AC-036).
   **왜**: 승인만 먼저 커밋하고 canonical을 다음 수집 배치의 dedup에 맡기면, 그 사이(최대 하루) **공공 원본과 민간 중복본이 리스트·검색에 나란히 노출**된다 — PRD Goal 3(dedup 오합치 0)의 사용자 체감이 깨지는 구간. 승인 = 공개인 이상 공개 시점에 canonical이 이미 정해져 있어야 한다 (AC-036).

   **검수 판정 대상은 사람이 본 그 스냅샷이어야 한다(낙관적 동시성) — 승인·반려 둘 다**: 검수 CLI는 pending 내용을 읽을 때 그 행의 `updated_at`을 함께 들고, **승인이든 반려든** 판정 UPDATE를 이렇게 건다:

   ```sql
   UPDATE opportunity
      SET review_status = :verdict, updated_at = now()   -- ← 판정도 updated_at을 반드시 올린다
    WHERE id = :id
      AND updated_at = :seen_at        -- 내가 본 스냅샷 그대로인가
      AND review_status = 'pending';   -- 아직 아무도 판정 안 했는가
   ```

   0행이 갱신되면 판정을 취소하고 "내용이 바뀌었거나 이미 판정됐다 — 다시 검수하라"고 알린다.
   **두 조건이 각각 다른 경합을 막는다**: `updated_at` 비교는 *수집 배치*와의 경합을, `review_status = 'pending'` 비교는 *다른 검수자*와의 경합을 막는다. 그리고 `SET`에서 `updated_at`을 올리는 게 필수다 — `updated_at`은 `DEFAULT now()`일 뿐 **자동 갱신 트리거가 없어서**(§2 스키마), 판정이 이 값을 안 건드리면 같은 행을 함께 읽은 두 검수자의 **반대 판정이 둘 다 성공해 나중 것이 앞선 결정을 조용히 덮는다**(AC-036).
   **왜**: 검수자가 화면을 읽은 뒤 판정을 입력하기 전에 일일 배치가 같은 행을 UPSERT하면(그 행은 `pending`이라 규칙 4의 강등도 안 걸린다) **사람이 본 값과 확정되는 값이 달라진다**. 승인 쪽은 미검증 내용이 공개되는 문제이고, **반려 쪽은 더 나쁘다** — 규칙 4에서 `rejected`는 이후 재수집에도 불변이라, 보지도 않은 새 내용이 영구 반려로 굳고 **검수 큐에 다시 나타나지 않아 그대로 유실**된다 (AC-036).
9. **페르소나·금액**: 민간은 구조화 필드 없음 → 크롤러는 `target_*` NULL 적재(억지 채움 금지 — 절대규칙 8). **검수 CLI에서 수동 태깅**(태깅 단계는 필수, 값은 '미상'=NULL 허용). 금액은 §6-E 파이프라인 공용 + 검수 시 확인.
10. **검수 CLI**: `apps/ingest`의 poetry 스크립트(예: `python -m ingest.review`) — pending 목록 조회 → 건별 승인/반려/태깅(승인은 규칙 8의 트랜잭션). **관리자 웹 UI 아님**(PRD Out-of-Scope 유지).
11. **수동 등록도 정식 편입된 source만 — DB가 강제한다**: 뉴스레터 채널(PRD FR-010 8항) 등 사람이 직접 넣는 경로도 **`source`는 소스 레지스트리 + api-spec `source` enum에 이미 편입된 값**이어야 한다(편입 = 체크리스트 6항목 + 3인 합의). 미편입 소스는 등록하지 않고 백로그에 둔다 — enum 밖 임시값(`sparklabs` 등)을 넣으면 **api-spec `source` 계약이 깨져 같은 값으로 필터 요청 시 400**이 되고, 기존 4종 중 하나를 빌려 쓰면 출처 표기가 틀어진다. "게시판이 없다"는 수집 방식의 문제일 뿐 편입 절차를 건너뛸 사유가 아니다.
    절차만으로는 오타 한 번에 뚫리므로 위 **`ck_opportunity_source`가 편입 7종만 통과**시킨다(AC-034). 규칙 2와 마찬가지로 **신규 소스 편입 시 두 제약을 함께 ALTER**해야 한다 — `ck_opportunity_source`(값 허용) + 공공이면 `ck_opportunity_review_status`(NULL 허용 분기).
12. **external_id 체계(파일럿 4소스 — 구현 시 안정성 검증 후 확정 기록)**: `asan-nanum`=공지 URL slug / `kakao-impact`=`atclId` / `sopoong`=게시글 식별자 / `kb-innovation-hub`=공고 번호. 모두 VARCHAR(64) 이내.

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
3. ~~출처 간 dedup~~ → **§6-D로 확정 설계 완료**(스코어링 임계 0.85·canonical 선정은 노출 가능성 → 출처 → 정보량 → id·페르소나 3단계). 남은 건 임계값 튜닝(실데이터로 오합치율 검증).
4. R&D(SMTECH·과기부)·중소벤처24: 기업마당과 중복 가능성 높음 → 중복률 실측 후 Phase 2 결정.
5. `screens.md`에서 노출 컬럼 확정 → eligibility_detail·apply_url·organization_type 표시 범위.
