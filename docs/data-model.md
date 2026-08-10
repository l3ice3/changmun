# data-model.md

창업 지원·투자·공모전 정보 큐레이션 서비스의 데이터 모델. **[LOCKED]**
**K-Startup 공식 설계서(v2.0) + 코드표 + 라이브 응답(XML/JSON 10건) 교차검증 완료본.**
Java(서빙)·Python(수집)이 공유하는 유일한 계약.

> **v2 개정 진행 중 (2026-08-10 — 3인 합의 대상).** §2가 단일 `opportunity` 테이블에서
> **저장 계층 3종**(`source_registry` / `source_record` / `opportunity`)으로 바뀐다.
> 계기는 FR-011 민간 소스 편입 — 한 테이블이 관측·파생·병합·검수 워크플로를 동시에 담아
> 규칙이 감당 못 할 만큼 불어났다(경위와 없어지는 규칙 목록은 §2 도입부와 §2-E).
> **v1 실효 스키마는 `/db/migrations/`가 단일 진실**이며, 합의 전까지 운영은 v1이다.

---

## 0. 설계 원칙

1. 스키마 단일 진실 = Flyway SQL. Spring은 `ddl-auto=validate` 고정.
2. 정규화·중복제거·검증은 전부 크롤러 책임. 서빙은 깨끗한 DB 가정.
3. 멱등성은 DB가 강제: `(source_code, external_id)` UNIQUE + UPSERT.
4. status는 저장하지 않고 조회 시 계산(§4).
5. snake_case. `user`→`app_user`.
6. **계층을 섞지 않는다(v2).** 소스가 준 관측·그것만으로 만든 파생 = `source_record` /
   여러 출처를 합친 실체 = `opportunity`. 상속·수동 태깅은 실체층에만 쓴다. 한 값이 두 계층에
   동시에 살면 "무엇과 비교해야 하는가"가 모호해지고, 그 모호함을 메우는 규칙이 계속 늘어난다.

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

## 2. 저장 계층 3종 【v2 개정안 — 2026-08-10, 3인 합의 대상】

> **왜 나눴나.** v1은 `opportunity` 한 테이블이 네 가지를 동시에 담았다 — ① 소스가 준 관측
> ② 그 관측만 보고 만든 파생(정규화·페르소나·금액) ③ 여러 출처를 합친 실체(dedup 그룹)
> ④ 사람 검수 워크플로(FR-011). **②와 ③이 같은 컬럼을 공유한 것**이 문제의 뿌리였다:
> 그룹 상속이 멤버의 자체 파싱값을 덮어써 소실시키고, 그 소실을 메우려고 `raw` 안에
> 별도 스냅샷을 넣어 비교하는 규칙이 생겼다(구 §6-F 규칙 4). 민간 소스를 붙이며 ③·④가
> 처음으로 필수가 되자 규칙이 급격히 불어났다. **분리축은 "소스"가 아니라 "계층"이다** —
> 소스별로 테이블을 나누면 공통 축(마감일 정렬·페르소나 필터·검색·dedup)이 전부
> 크로스 테이블이 되고 소스마다 테이블이 늘어난다. 소스별로 다른 건 원본 필드뿐이고
> 그건 이미 `raw JSONB`가 흡수한다.

| 계층 | 한 행이 뜻하는 것 | 쓰는 주체 |
|---|---|---|
| `source_registry` | 수집 대상 소스 1종 | 사람 (마이그레이션 seed) |
| `source_record` | "이 소스가 이 URL에서 이렇게 말했다" | 수집 배치 |
| `opportunity` | 세상의 공고 1건 (= dedup 그룹) | 병합 배치 · **서빙이 읽는 유일한 표** |

**계층 경계 (이 한 줄이 규칙 대부분을 대체한다):** `source_record`에는 **그 레코드 하나만 보고
결정론적으로 재계산할 수 있는 값만** 들어간다. 그룹 상속값·검수 CLI의 수동 태깅은 절대
들어오지 않는다. 그래서 ⑴ 매 배치 전 컬럼을 덮어써도 안전하고, ⑵ 직전 값과의 비교가 곧
"원문이 바뀌었나 또는 파서가 바뀌었나"의 답이 된다.

---

### 2-A. `source_registry` — 소스 추가는 INSERT (ALTER 아님)

v1은 `source` 값 화이트리스트를 CHECK 제약으로 강제해, 소스 하나 편입에 마이그레이션
ALTER가 두 번 필요했다(구 §6-F 규칙 2·11). 소스는 스키마가 아니라 **데이터**다.

```sql
CREATE TABLE source_registry (
    code            VARCHAR(40) PRIMARY KEY,     -- 'k-startup' … 'asan-nanum'
    display_name    TEXT        NOT NULL,        -- 사용자 노출 한글 라벨의 단일 진실
    kind            VARCHAR(10) NOT NULL CHECK (kind IN ('public', 'private')),
    requires_review BOOLEAN     NOT NULL,        -- 민간 = true (FR-011 검수 게이트)
    canonical_rank  SMALLINT    NOT NULL,        -- 대표 선정 ② 순위. 작을수록 우선
    enabled         BOOLEAN     NOT NULL DEFAULT TRUE,   -- 차단 관측 시 수집만 중단
    UNIQUE (code, requires_review)               -- source_record의 복합 FK 대상
);
```

seed(7종) — `canonical_rank`는 §6-D 규칙 5 ②(K-Startup > 기타 공공 > 민간)를 그대로 옮긴 값이다.

| code | display_name | kind | requires_review | canonical_rank |
|---|---|---|---|---|
| `k-startup` | K-Startup | public | false | 0 |
| `bizinfo` | 기업마당 | public | false | 1 |
| `ontong-youth` | 온통청년 | public | false | 1 |
| `asan-nanum` | 아산나눔재단 | private | true | 2 |
| `kakao-impact` | 카카오임팩트 | private | true | 2 |
| `sopoong` | 소풍벤처스 | private | true | 2 |
| `kb-innovation-hub` | KB이노베이션허브 | private | true | 2 |

> `display_name`은 프론트 `SOURCE_LABELS`(`.claude/rules/web.md` 규칙 11)와 같은 집합이어야
> 한다. api-spec `source` enum과의 동기화는 여전히 **문서 의무**다 — DB는 값의 유효성만
> 강제하고, 클라이언트 계약이 같이 늘었는지는 못 본다.

---

### 2-B. `source_record` — 관측 + 자체 파생

v1의 `opportunity`가 사실 이것이다. 컬럼 의미는 §6·6-B·6-C의 소스별 매핑이 그대로 유효하다.

```sql
CREATE TABLE source_record (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    source_code             VARCHAR(40)  NOT NULL,
    external_id             VARCHAR(64)  NOT NULL,
    requires_review         BOOLEAN      NOT NULL,   -- registry에서 복제(복합 FK가 일치 강제)
    review_status           VARCHAR(10)  NOT NULL,   -- DEFAULT 없음 = 누락 시 INSERT 실패

    -- 원문 사실 필드 (소스가 준 것을 정규화만 한 값)
    title                   TEXT         NOT NULL,
    summary                 TEXT,
    category                VARCHAR(40),
    region                  TEXT[],
    organization            TEXT,
    organization_type       TEXT,
    eligibility_detail      TEXT,
    application_start_date  DATE,
    application_deadline    DATE,
    is_always_open          BOOLEAN      NOT NULL DEFAULT FALSE,
    detail_url              TEXT         NOT NULL,
    apply_url               TEXT,
    source_status           VARCHAR(10),

    -- 자체 파생 (이 레코드의 본문만 보고 뽑은 값 — 상속·수동태깅 절대 금지)
    support_amount          TEXT,
    max_support_amount      BIGINT,
    total_program_budget    BIGINT,
    target_startup_stage    TEXT[],
    target_audience_type    TEXT[],

    opportunity_id          BIGINT REFERENCES opportunity (id) ON DELETE SET NULL,
    is_publishable          BOOLEAN GENERATED ALWAYS AS
                            (review_status IN ('not_required', 'approved')) STORED,

    raw                     JSONB,
    first_seen_at           TIMESTAMPTZ  NOT NULL DEFAULT now(),   -- UPSERT 때 불변
    updated_at              TIMESTAMPTZ  NOT NULL DEFAULT now(),

    CONSTRAINT uq_source_record UNIQUE (source_code, external_id),
    CONSTRAINT fk_source_record_registry FOREIGN KEY (source_code, requires_review)
        REFERENCES source_registry (code, requires_review) ON UPDATE CASCADE,
    CONSTRAINT ck_source_record_review CHECK (
        review_status IN ('not_required', 'pending', 'approved', 'rejected')
        AND requires_review = (review_status <> 'not_required')
    )
);

CREATE INDEX idx_source_record_opportunity ON source_record (opportunity_id);
CREATE INDEX idx_source_record_pending     ON source_record (source_code)
       WHERE review_status = 'pending';      -- 검수 큐 조회
```

**`review_status`가 `NOT NULL` 4값인 이유.** v1 안(`NULL`=공공)은 `NULL IN (...)`이 false가
아니라 NULL이라 CHECK가 통과시키는 함정이 있었고, 이를 막느라 `CASE … IS NOT NULL AND …`
분기와 그 이유를 설명하는 주석이 필요했다. **공공을 `'not_required'`라는 명시값으로 두면 그
함정이 문법적으로 발생할 수 없다.** `DEFAULT`를 두지 않아 상태를 빠뜨린 INSERT는 실패하고
(fail-closed — AC-039), 복합 FK가 "민간인데 `not_required`" / "공공인데 `pending`"을 함께 막는다.
CHECK 두 개가 한 줄로 줄고, **신규 공공 소스 편입 시 제약을 ALTER할 필요도 없어진다**
(registry INSERT로 끝).

**`is_publishable`은 생성 컬럼(GENERATED)이다.** "노출 자격이 있는 레코드"라는 판정을 쿼리마다
손으로 반복하면 반드시 어딘가 빠뜨린다(구 §6-F 규칙 1이 경고하던 `otherSources` 누락이 그 예).
생성 컬럼이라 정의가 한 곳에 있고 드리프트가 불가능하다.

> `source_record.opportunity_id` ↔ `opportunity.representative_record_id`는 서로를 참조한다.
> 마이그레이션에서는 두 테이블을 먼저 만들고 **FK를 `ALTER TABLE ... ADD CONSTRAINT`로 뒤에
> 붙인다**(§2-D). 순환 자체는 문제가 아니다 — 한 쪽은 "이 레코드가 속한 실체", 다른 쪽은
> "이 실체를 대표하는 레코드"로 뜻이 다르고, 둘 다 병합 배치가 같은 트랜잭션에서 쓴다.

---

### 2-C. `opportunity` — 실체(= dedup 그룹), 서빙이 읽는 유일한 표

```sql
CREATE TABLE opportunity (
    id                       BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    representative_record_id BIGINT       NOT NULL REFERENCES source_record (id),
    source_code              VARCHAR(40)  NOT NULL REFERENCES source_registry (code),

    -- 병합 결과 = 대표 레코드 값 + 그룹 상속(§6-D 페르소나 3단계, §6-E 규칙 6 금액)
    title                    TEXT         NOT NULL,
    summary                  TEXT,
    category                 VARCHAR(40),
    region                   TEXT[],
    organization             TEXT,
    organization_type        TEXT,
    eligibility_detail       TEXT,
    application_start_date   DATE,
    application_deadline     DATE,
    is_always_open           BOOLEAN      NOT NULL DEFAULT FALSE,
    detail_url               TEXT         NOT NULL,
    apply_url                TEXT,
    support_amount           TEXT,
    max_support_amount       BIGINT,
    total_program_budget     BIGINT,
    target_startup_stage     TEXT[],
    target_audience_type     TEXT[],

    is_visible               BOOLEAN      NOT NULL DEFAULT FALSE,  -- fail-closed 기본값
    first_seen_at            TIMESTAMPTZ  NOT NULL,   -- 멤버 중 최소(= sort=latest 계약 유지)
    updated_at               TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE INDEX idx_opportunity_deadline   ON opportunity (application_deadline);
CREATE INDEX idx_opportunity_category   ON opportunity (category);
CREATE INDEX idx_opportunity_region     ON opportunity USING gin (region);
CREATE INDEX idx_opportunity_stage      ON opportunity USING gin (target_startup_stage);
CREATE INDEX idx_opportunity_audience   ON opportunity USING gin (target_audience_type);
CREATE INDEX idx_opportunity_title_trgm ON opportunity USING gin (title gin_trgm_ops);
CREATE INDEX idx_opportunity_visible    ON opportunity (is_visible) WHERE is_visible;
```

**불변식** (병합 배치·검수 CLI가 함께 지킨다):
1. `is_visible = true` ⇔ 그룹에 `is_publishable` 멤버가 1개 이상 있다.
2. `representative_record_id`는 **`is_publishable` 멤버 중에서** 뽑는다(§6-D 규칙 5의 순위 그대로).
   노출 가능 멤버가 없으면 `is_visible = false`이고 대표는 아무 멤버나 둔다(어차피 미노출).
3. `id`는 **대표가 바뀌어도 불변**이다. v1은 canonical이 교체되면 `/opportunities/{id}`의 id가
   바뀌어 **SSG/ISR로 색인된 SEO URL과 `bookmark.opportunity_id`가 대표 교체에 흔들렸다.**
   실체층이 생기면서 이 결함이 구조적으로 사라진다.

> 물리 테이블인 이유: 뷰로 두면 대표 선정·상속 로직이 통째로 SQL에 들어가고 인덱스를 못 쓴다.
> 갱신이 일 1회 배치 + 검수 판정 시점뿐이라 물리화가 정직하다.
> `dedup_group_id`·`is_canonical` 컬럼은 **없어진다** — 그룹은 이 테이블의 행 자체이고,
> 대표는 `representative_record_id` 한 컬럼이다.

---

### 2-D. v1 → v2 마이그레이션 (id 승계)

현행 운영 데이터(2026-07-26 실측 29,874행: `k-startup` 29,452 · `ontong-youth` 325 ·
`bizinfo` 97)를 재수집 없이 옮긴다. **`first_seen_at`을 보존해야** `sort=latest` 계약이 깨지지
않으므로 전량 재수집이 아니라 이관이다.

1. `source_registry` 생성 + 7종 seed.
2. **`opportunity` → `source_record` RENAME** (id 그대로 승계) + 신규 컬럼 추가.
   공공 3소스 기존 행은 `review_status = 'not_required'` · `requires_review = false` 백필.
   `source` → `source_code` 컬럼명 변경.
3. 신 `opportunity` 생성 후 그룹별 1행 INSERT — **id는 현재 `is_canonical=true` 행의 id를 승계**
   (`OVERRIDING SYSTEM VALUE` + `setval`). 단독 공고는 자기 id. → **기존 상세 URL 전량 보존.**
4. `source_record.opportunity_id` 역참조 채우기 → `bookmark.opportunity_id` FK를 신 테이블로
   재지정. **비-canonical 행을 찜한 북마크는 그 행이 속한 그룹의 opportunity id로 리매핑**한다
   (v1 AC-024가 허용하던 상태 — 이관 시 자연히 해소된다).
5. 구 인덱스·CHECK 정리.

> 마이그레이션 파일은 `docs/rules/git.md`의 타임스탬프 버전명 규칙을 따른다. 3·4번이 한
> 트랜잭션이어야 북마크가 잠시라도 끊기지 않는다.

---

### 2-E. 이 구조가 없애는 규칙들

문서·코드에서 **삭제되는** 것들이다. 개정의 실익이 여기에 있다.

| v1에서 필요했던 것 | v2 |
|---|---|
| 구 §6-F 규칙 4 — 강등 판정용 `raw` 스냅샷(원문 필드 + 상속 전 자체 파싱 결과)을 저장·비교 (문서 ~15줄 + 전용 코드) | **삭제.** `source_record`엔 상속값이 없으므로 UPSERT의 `ON CONFLICT` 한 문장이 직전 값과 직접 비교한다(§6-F 규칙 3) |
| 구 §6-F 규칙 2 — `CASE` CHECK 2개 + `NULL IN (...)`은 NULL이라는 함정 주석 | `review_status NOT NULL` 4값 + CHECK 한 줄 (§2-B) |
| 구 §6-F 규칙 8·4 — 승인/강등 시 canonical 원자적 재선정 2곳 | 그룹 1행 재병합 1곳 |
| 서빙 전 경로에 `is_canonical = true AND (review_status IS NULL OR = 'approved')` 복붙 (+ `ids=`는 예외의 예외) | `WHERE is_visible` 하나. **예외 조항 없음** (§3) |
| `ck_opportunity_source`·`ck_opportunity_review_status`를 신규 소스마다 ALTER | `source_registry` INSERT |
| `apps/ingest/db.py`의 `_COLLECTED_COLUMNS`/`_ENRICHED_COLUMNS` 분리 — "UPDATE가 분류 칸을 건드리면 상속이 유실된다"는 제약과 그 우회를 위한 후처리 DB 왕복 4개 | 단일 UPSERT가 전 컬럼 갱신. 정규화·페르소나 직접·금액 추출은 수집 시점에 Python에서 끝낸다 |
| v1 AC-024 — 찜한 공고가 canonical에서 강등돼도 유지 | **불필요.** id가 그룹 단위라 "강등"이라는 사건 자체가 없다 |

**남는 복잡성 (정직하게):** 검수 낙관적 동시성(§6-F 규칙 5)은 그대로 남는다 — 계층 문제가
아니라 실제 동시성 문제다. 승인 CLI가 "판정 + 그 그룹 재병합"을 한 트랜잭션으로 묶는 요구도
남되, 대상이 "그룹 1행 재계산"으로 좁아진다. api-spec `source` enum ↔ registry 동기화도
문서 의무로 남는다.

---


## 3. 서빙(Spring) 조회 예시

```sql
SELECT *
FROM opportunity
WHERE is_visible                                                   -- 유일한 노출 게이트(§2-C 불변식 1)
  AND (:category IS NULL OR category = :category)
  AND (:region   IS NULL OR region @> ARRAY[:region]::text[])   -- 배열 포함(GIN 인덱스 활용)
  AND (:stage    IS NULL OR :stage    = ANY(target_startup_stage))   -- 'PRE_STARTUP'
  AND (:audience IS NULL OR :audience = ANY(target_audience_type))   -- 'UNIV_STUDENT'
  AND (:only_open = FALSE OR is_always_open OR application_deadline >= CURRENT_DATE OR application_deadline IS NULL)  -- 진행중·상시·기간미상(UNDATED) 포함, CLOSED만 제외 (api-spec §0)
ORDER BY application_deadline ASC NULLS LAST
LIMIT :size OFFSET :offset;
```

`stage='PRE_STARTUP'` 또는 `audience='UNIV_STUDENT'` = "예비창업자/대학생이 지원 가능한 공고만". 정부 사이트가 안 해주는 핵심 큐레이션.

**`is_visible` 하나가 v1의 두 조건(`is_canonical` + 검수 게이트)을 대신하며, 예외 경로가 없다** —
리스트·검색·상세·`ids=`(찜)·`stats` 집계 전부 같은 조건을 쓴다. v1은 `ids=`가 canonical 예외이면서
검수 게이트는 적용해야 하는 "예외의 예외"였고, 조건을 손으로 복붙하다 보니 상세 응답에
중첩되는 `otherSources`에서 빠뜨리기 쉬웠다.

`otherSources`(api-spec §2)만은 실체가 아니라 멤버를 조회하므로 계층이 하나 내려간다:

```sql
SELECT r.source_code, r.detail_url
FROM source_record r
WHERE r.opportunity_id = :id
  AND r.is_publishable                     -- 생성 컬럼 — 조건이 한 단어이고 정의는 §2-B 한 곳
  AND r.id <> :representative_record_id;
```

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

> **v2에서 이 절의 "어떤 소스를 넣는가"는 `source_registry` 테이블(§2-A)이 집행한다.** 아래는 그
> 테이블에 행을 넣어도 되는지 판단하는 **편입 정책**이며, 판정 근거·실사 이력의 기록처다.

- **`source` enum (확정):** 공공 `k-startup`(메인) · `bizinfo`(창업분야만) · `ontong-youth`(창업 슬라이스만) + **민간 화이트리스트(FR-011 파일럿)** `asan-nanum` · `kakao-impact` · `sopoong` · `kb-innovation-hub`. external_id 체계가 소스마다 다름(`pbanc_sn` 숫자 / `pblancId` 문자열 / `plcyNo` 20자리 / 민간은 §6-F) → `external_id`는 VARCHAR(64).
- **비API 공공 소스 = 크롤링 영역 = 제외 유지:** 공공기관이어도 **API가 없고 로그인·JS로 막힌 곳**(CCEI, 전국 테크노파크, 지역기관 다수)은 민간과 동일 취급. CCEI 공식 창업 공고는 K-Startup/기업마당이 대부분 커버하므로 직접 수집 가치 낮음. 커버리지 갭이 실증되면 편입 체크리스트로 재검토.
- **R&D(SMTECH·과기부)·중소벤처24:** API는 있으나 기업마당과 중복 큼 → Phase 2(중복률 실측 후).

### 민간 소스 편입 체크리스트 (FR-011 — 신규 소스는 전 항목 통과 + 3인 합의 필수)

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
4. **그룹핑:** 동일 판정 쌍 Union-Find → `opportunity` 1행에 대응(v1의 `dedup_group_id`. 단독 공고도 실체 1행을 가진다 — v2는 "그룹 없음"이라는 특수 케이스가 없다).
5. **대표 선정:** **① 노출 가능성 → ② 출처(`source_registry.canonical_rank` — K-Startup 우선, 페르소나 필드 풍부) → ③ 정보량(채워진 컬럼 수) → ④ id 안정 정렬** 순으로 뽑아 `opportunity.representative_record_id`에 넣는다. 후보는 **`is_publishable` 멤버로 한정** — 민간 `pending`·`rejected`가 대표가 되거나 병합 결과를 오염시키지 않는다(§6-F). 민간이 낮은 건 ②뿐이므로, **마감된 공공 건과 진행 중인 승인 민간 건이 같은 그룹이면 민간이 대표가 된다**(①이 먼저다).
   - **①이 최우선인 이유(AC-010)**: 마감된 레코드가 노출 가능한 공고를 대표 자리에서 가리면 기본 `status=open` 목록에서 **그룹 전체가 사라진다**. 노출 순위는 `진행중·상시(2) > 기간미상 UNDATED(1) > 마감 CLOSED(0)` — UNDATED가 CLOSED보다 위인 것은 api-spec §0이 UNDATED를 기본 노출에 포함하기 때문.
   - 구현: `apps/ingest`의 `_pick_canonical`(`dedup/engine.py`)이 이 순서 그대로다.
6. **병합(materialize):** 대표 값 + 아래 상속 규칙을 적용해 `opportunity` 행을 UPSERT하고 `is_visible`을 확정한다. **멤버(`source_record`)를 UPDATE하지 않는다** — v1은 상속을 멤버 컬럼에 써넣어 자체 파싱값을 덮었고(§2 도입부), 그래서 이 단계가 멱등하지 않았다. v2의 병합은 입력이 같으면 결과가 같다.
- **서빙:** `opportunity`만 조회한다(`WHERE is_visible` — §3). 상세의 "다른 출처에서도 게재"는 멤버를 조회한다(§3 `otherSources` 쿼리).

### 페르소나 부여 3단계 폭포 (신호 강한 순)
1. **구조화(직접):** K-Startup `biz_enyy`/`aply_trgt` → 표준 코드(§7). *최고 신뢰.* → `source_record`에 저장.
2. **상속(dedup 보너스):** 그룹에 K-Startup 멤버가 있으면 → **병합 시 `opportunity.target_*`가 멤버들의 합집합**이 된다. 기업마당 창업분야 상당수가 추가 작업 없이 해결. (부분 신호를 가진 멤버가 있어도 union이라 더 풍부한 값이 버려지지 않는다.)
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
6. **dedup 그룹 병합**: 그룹 멤버들의 추출값을 **`opportunity` 행을 만들 때 컬럼별로 합친다**(§6-D 단계 6 — 대표의 자체값 우선, 없으면 다른 멤버 값). 최대액과 총예산이 서로 다른 출처에서 나온 그룹도 각각 살아남도록 **컬럼별로** 고른다. **예외 — `support_amount` 원문은 max의 출처를 따른다**: `max_support_amount`를 다른 멤버에서 가져오면 원문 표기도 그 멤버 것을 쓴다 — 총예산 문구가 남의 max와 함께 기업당 지원액처럼 서빙되는 것 방지(Codex #69, api-spec §1). K-Startup은 본문에 금액이 없어(첨부파일 구조) 교차 소스 병합이 주 채움 경로.
   > v1은 이 상속을 **멤버 행에 UPDATE**해서 넣었다. 그 결과 멤버의 자체 파싱값이 사라져 "재수집 시 무엇과 비교할 것인가"가 풀리지 않는 문제가 됐고(구 §6-F 규칙 4의 스냅샷 규칙), 매 배치 값이 흔들려 멱등하지도 않았다. v2는 멤버를 건드리지 않으므로 두 문제가 함께 사라진다.
7. **원문 보존**: 추출에 사용한 원문 표현을 `support_amount`(TEXT)에 저장(표시·검수용). 추출 실패 시 세 컬럼 모두 건드리지 않음(NULL 유지).

### 커버리지 현실 (라이브 실측 2026-07-18)
진행중 공고 기준 채움 가능: 기업마당 ~18% · 온통청년 ~8% · **K-Startup ~0.6%**(금액이 첨부 HWP에만 있음) — 전체 약 5%. K-Startup 첨부 추출은 **크롤링 금지 원칙과 충돌 → Phase 2**(이 실측이 "커버리지 갭 실증 시 재검토" 조건 충족). 민간 수집(§6-F) 결합 시 같은 파이프라인으로 총액 지표 성장.

---

## 6-F. 민간 소스 공통 규칙 (FR-011 — 하이브리드) 【2026-07-26 신설 · 2026-08-10 v2로 축약 — 3인 합의 대상】

> 파일럿 4소스: `asan-nanum` · `kakao-impact` · `sopoong` · `kb-innovation-hub` (편입 근거·실사는 소스 레지스트리). 소스별 상세 필드 매핑은 구현 시 각 소스 파일 + 본 절에 확정 기록(§6-B·6-C 선례).
>
> **v2 축약 경위**: 이 절은 v1의 단일 테이블 위에서 검수 게이트를 세우느라 규칙 11개까지 늘었다. §2 계층 분리 후 그중 다섯(스냅샷 비교·NULL 함정 CHECK·canonical 원자성 2곳·서빙 불변식 복붙)이 스키마로 흡수돼 사라졌다. 없어진 목록은 §2-E.

### 스키마

민간 전용 스키마는 **없다.** `source_registry.requires_review = true` + `source_record.review_status`
(§2-A·2-B)가 전부이며, 소스 편입은 마이그레이션이 아니라 registry INSERT다.

### 규칙

1. **서빙 불변식**: 리스트·검색·상세·`ids=`·홈 지표(`stats`)는 `opportunity.is_visible`만 본다.
   상세의 `otherSources`는 멤버를 조회하므로 `source_record.is_publishable`을 본다(§3).
   **두 컬럼 모두 정의가 스키마에 있고 조건이 한 단어라, 경로마다 조건을 복붙하다 빠뜨리는
   v1의 실패 양식이 재발하지 않는다.** `pending`·`rejected`는 어떤 경로로도, 카운트에도,
   승인된 공고의 형제 목록에도 나타나지 않는다 (AC-040).
2. **상태 누락은 INSERT 실패 — DB가 강제한다(fail-closed)**: `review_status`는 `NOT NULL`이고
   `DEFAULT`가 없다. 민간 4소스든 뉴스레터 수동 등록이든 신규 수집기든 **상태를 빠뜨린 행은
   들어가지 못한다** — "상태 미지정 = 즉시 공개"로 검수 게이트가 우회되는 사고를 막는다(AC-039).
   복합 FK가 "민간인데 `not_required`" / "공공인데 `pending`"도 함께 거부한다.
   v1과 달리 **신규 공공 소스 편입 시 제약을 ALTER할 필요가 없다**(§2-A).
3. **적재**: 민간 크롤러는 항상 `review_status='pending'`으로 INSERT. 재수집 UPSERT는 내용 필드를
   갱신하고 `first_seen_at`은 불변. `opportunity_id`는 병합 배치가 채운다(미승인 건은 NULL).
4. **재수집 시 `review_status` 전이 — 승인은 "그 시점 내용"에 대한 승인이다**:
   - `rejected` → **불변**(반려 공고가 재수집으로 부활 금지 — AC-041).
   - `pending` → **불변**(검수 대기 유지 — 내용만 최신화).
   - `approved` → **핵심 필드가 바뀌면 `pending`으로 되돌린다**(= 재검수 전까지 노출 중단, AC-044).
     핵심 필드 = `title` · `application_start_date` · `application_deadline` · `support_amount` ·
     `max_support_amount` · `total_program_budget`. 그 밖(요약·기관 표기 등)은 승인을 유지한다.

   **왜**: 최초 승인만 검수하면 이후의 마감일 변경·오파싱이 무검증으로 노출된다 — 가드레일 2가
   승인 이후 구간에서 통째로 빈다. 재검수까지 며칠 미노출을 감수하는 선택이며, 그 반대(틀린
   마감일 노출)가 더 큰 해라는 판단이다. 민간 공고량이 소스당 연 1~5건이라 재검수 부담도 작다.

   **판정은 UPSERT 한 문장이다.** `source_record`에는 상속값도 수동 태깅도 없으므로(§2 계층 경계)
   저장된 값이 곧 "직전에 이 원문을 이 파서로 읽은 결과"다. 별도 스냅샷을 둘 이유가 없다:

   ```sql
   INSERT INTO source_record (...) VALUES (...)
   ON CONFLICT (source_code, external_id) DO UPDATE SET
       <내용 필드 전부> = EXCLUDED.<...>,
       review_status = CASE
           WHEN source_record.review_status = 'approved'
            AND (source_record.title, source_record.application_start_date,
                 source_record.application_deadline, source_record.support_amount,
                 source_record.max_support_amount, source_record.total_program_budget)
                IS DISTINCT FROM
                (EXCLUDED.title, EXCLUDED.application_start_date,
                 EXCLUDED.application_deadline, EXCLUDED.support_amount,
                 EXCLUDED.max_support_amount, EXCLUDED.total_program_budget)
           THEN 'pending'
           ELSE source_record.review_status      -- rejected·pending·not_required 불변
       END,
       updated_at = now();
   ```

   비교 대상에 **파생 컬럼(금액 2종)이 들어 있는 게 핵심**이다. 원문 표기가 그대로여도 파서가
   바뀌면(오추출 버그 수정·규칙 승격 — §6-E는 실제로 그 이력이 있다) 값이 달라지므로 함께
   잡힌다. v1은 상속이 컬럼을 덮어써서 DB 비교가 **매 배치 강등되는 무한 루프**를 만들었고,
   그래서 `raw`에 원문 필드 + 상속 전 자체 파싱 결과를 둘 다 담은 스냅샷을 따로 저장해야 했다.
   계층이 갈리면서 오탐(무한 루프)과 누락(파서 변경 무검증)이 **동시에** 사라진다.

   **강등 후 대표는 재병합이 다시 뽑는다.** 강등된 행은 `is_publishable`이 false가 되어 대표
   후보에서 빠지므로, 같은 트랜잭션에서 그 그룹의 `opportunity`를 재병합한다(§6-D 단계 5·6).
   남은 노출 가능 멤버가 있으면 그 멤버가 대표가 되고, 없으면 `is_visible = false`가 된다.
   **v1처럼 "그룹째 목록에서 사라지는" 사고 경로가 없다** — 실체 행은 남고 대표만 바뀐다(AC-044).
5. **검수 판정은 사람이 본 스냅샷에 대해서만 유효하다 (낙관적 동시성 — 승인·반려 둘 다)**:
   검수 CLI는 pending 내용을 읽을 때 그 행의 `updated_at`을 함께 들고, 판정을 이렇게 건다.

   ```sql
   UPDATE source_record
      SET review_status = :verdict, updated_at = now()   -- ← 판정도 updated_at을 반드시 올린다
    WHERE id = :id
      AND updated_at = :seen_at        -- 내가 본 스냅샷 그대로인가
      AND review_status = 'pending';   -- 아직 아무도 판정 안 했는가
   ```

   0행이 갱신되면 판정을 취소하고 "내용이 바뀌었거나 이미 판정됐다 — 다시 검수하라"고 알린다.
   **두 조건이 각각 다른 경합을 막는다**: `updated_at` 비교는 *수집 배치*와의, `review_status =
   'pending'` 비교는 *다른 검수자*와의 경합을 막는다. `SET`에서 `updated_at`을 올리는 게 필수다 —
   자동 갱신 트리거가 없어서(§2-B), 판정이 이 값을 안 건드리면 같은 행을 함께 읽은 두 검수자의
   **반대 판정이 둘 다 성공해 나중 것이 앞선 결정을 조용히 덮는다**(AC-041).
   **왜**: 검수자가 화면을 읽은 뒤 판정을 입력하기 전에 일일 배치가 같은 행을 UPSERT하면(그 행은
   `pending`이라 규칙 4의 강등도 안 걸린다) 사람이 본 값과 확정되는 값이 달라진다. 승인 쪽은
   미검증 내용이 공개되는 문제이고, **반려 쪽은 더 나쁘다** — `rejected`는 이후 재수집에도
   불변이라 보지도 않은 새 내용이 영구 반려로 굳고 검수 큐에 다시 나타나지 않아 유실된다.
6. **승인은 병합과 원자적이다**: 승인 CLI는 **한 트랜잭션 안에서** ① `review_status='approved'` →
   ② 해당 건의 dedup 판정(§6-D) → ③ 그룹 `opportunity` 재병합(대표·`is_visible` 확정)을 함께
   커밋한다. **왜**: 승인만 먼저 커밋하고 병합을 다음 배치에 맡기면 그 사이(최대 하루) 공공
   원본과 민간 중복본이 나란히 노출된다 — PRD Goal 3(dedup 오합치 0)의 체감이 깨지는 구간이다.
   승인 = 공개인 이상 공개 시점에 대표가 이미 정해져 있어야 한다 (AC-041).
7. **raw 정책 (절대규칙 3의 민간 적용)**: 공고 **본문 전문을 수집·저장하지 않는다** — 민간 공고문은
   공공누리 없는 저작물(전재 리스크). raw에는 목록·상세에서 추출한 **사실 필드**(제목·기관·기간·
   금액 표기·대상 문구)·원문 URL·수집 메타만. "원본 그대로" 원칙은 *수집한 것*에 한해 유지한다.
8. **수집 기술 Tier 1 한정 + 예절 의무**: requests+BeautifulSoup4+feedparser만. 매 실행 robots.txt
   확인 · UA `changmun-bot/1.0 (+https://changmun.com/bot)` · 요청 간 ≥1초 · 일 1회. robots 불허·
   403/429 → 해당 소스 스킵+리포트, 우회 금지 (AC-042). 차단이 반복되면 `source_registry.enabled`를
   false로 내려 수집만 멈춘다(적재된 승인 공고는 그대로 노출 — 편입 취소와 구분한다).
9. **페르소나·금액**: 민간은 구조화 필드 없음 → 크롤러는 `target_*` NULL 적재(억지 채움 금지 —
   절대규칙 8). **검수 CLI에서 수동 태깅**(태깅 단계는 필수, 값은 '미상'=NULL 허용). 수동 태깅은
   계층 경계상 `source_record`가 아니라 **`opportunity`에 쓴다** — 그래야 재수집이 사람의 판단을
   덮지 않고, 규칙 4의 비교에도 끼어들지 않는다. 금액은 §6-E 파이프라인 공용 + 검수 시 확인.
10. **검수 CLI**: `apps/ingest`의 poetry 스크립트(예: `python -m ingest.review`) — pending 목록 조회
    → 건별 승인/반려/태깅(승인은 규칙 6의 트랜잭션). **관리자 웹 UI 아님**(PRD Out-of-Scope 유지).
11. **수동 등록도 정식 편입된 source만**: 뉴스레터 채널(PRD FR-011 8항) 등 사람이 직접 넣는
    경로도 `source_code`가 `source_registry`에 있어야 한다(편입 = 체크리스트 6항목 + 3인 합의).
    FK가 오타·미편입 값을 거부한다. 미편입 소스는 등록하지 않고 백로그에 둔다 — registry 밖
    임시값을 쓰면 api-spec `source` 계약이 깨져 같은 값으로 필터 요청 시 400이 되고, 기존 4종 중
    하나를 빌려 쓰면 출처 표기가 틀어진다. "게시판이 없다"는 수집 방식의 문제일 뿐 편입 절차를
    건너뛸 사유가 아니다.
12. **external_id 체계(파일럿 4소스 — 구현 시 안정성 검증 후 확정 기록)**: `asan-nanum`=공지 URL
    slug / `kakao-impact`=`atclId` / `sopoong`=게시글 식별자 / `kb-innovation-hub`=공고 번호.
    모두 VARCHAR(64) 이내.

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

> **v2**: `bookmark.opportunity_id`는 계속 실체층(`opportunity`)을 참조한다 — 사용자가 찜한 건
> "공고 1건"이지 "출처별 기록"이 아니다. 실체 id가 대표 교체와 무관하게 고정되므로(§2-C 불변식 3)
> v1에서 필요했던 "강등돼도 찜 유지" 예외가 사라진다. 이관 절차는 §2-D 4번.

---

## 8-B. 쇼케이스 (스코프 확장 — 2026-08-01 사장님 단독 승인, `기획안-쇼케이스.md`)

> **LOCKED 변경 결정 기록**: 3인 합의 절차는 사장님 지시(2026-08-01, "합의 안 해도 돼, 그냥 진행")로 생략 — 이 절과 `기획안-쇼케이스.md` §9가 합의 기록을 대체한다. 팀 공지는 디스코드 #32. (Codex #78 P1 대응)

창업자 제품 홍보의 장. 선검수 후게시 — 여기의 `status`는 **쇼케이스 검수 상태**로, 공고의 "저장 금지 status(마감 산식)"와 무관한 별개 컬럼이다. 마이그레이션 `V20260801_1100__create_showcase.sql`.

```sql
CREATE TABLE showcase_product (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_user_id BIGINT       NOT NULL REFERENCES app_user (id),
    name          VARCHAR(80)  NOT NULL,
    tagline       VARCHAR(120) NOT NULL,
    description   TEXT         NOT NULL,
    url           VARCHAR(500),
    image         BYTEA,                  -- 1MB 제한(서비스 검증), 프로필 이미지와 동일 방식
    image_type    VARCHAR(30),
    category      VARCHAR(30)  NOT NULL,  -- APP_WEB | COMMERCE | CONTENT | LOCAL | ETC
    maker_name    VARCHAR(60)  NOT NULL,  -- 등록 시 입력한 팀명(표시명) — 계정 정보 비노출
    status        VARCHAR(10)  NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | REJECTED
    reject_reason VARCHAR(200),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    approved_at   TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE TABLE showcase_cheer (   -- 1인 1제품 1응원(복합 PK). 무결제 수요 신호
    product_id BIGINT NOT NULL REFERENCES showcase_product (id) ON DELETE CASCADE,
    user_id    BIGINT NOT NULL REFERENCES app_user (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (product_id, user_id)
);
CREATE TABLE showcase_comment ( -- 소프트 삭제(deleted_at)
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT NOT NULL REFERENCES showcase_product (id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_user (id),
    body VARCHAR(1000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);
```

**검수 운영(관리자 UI 없음 — DB 수동, 주 10건 초과 시 최소 승인 페이지 재논의):**
```sql
-- 승인
UPDATE showcase_product SET status='APPROVED', approved_at=now(), updated_at=now() WHERE id=?;
-- 거절
UPDATE showcase_product SET status='REJECTED', reject_reason='사유', updated_at=now() WHERE id=?;
```

---

## 9. 주요 설계 결정 & 트레이드오프

| 결정 | 이유 | 트레이드오프 |
|---|---|---|
| **저장 계층 3종 분리(v2)** | 관측·파생/실체/워크플로가 한 행에 섞여 상속이 자체 파싱값을 덮었고, 그 소실을 메우는 규칙이 계속 늘었다(§2 도입부) | 계층이 하나 늘어 ingest가 "레코드 쓰기 / 그룹 만들기" 2단. 이관 마이그레이션 1회 + api·ingest 조회·쓰기 계층 재작성 (응답 계약·`apps/web`은 무변경) |
| 실체층을 물리 테이블로 (뷰 아님) | 대표 선정·상속을 SQL 뷰에 넣으면 인덱스를 못 쓰고 로직이 쿼리에 갇힌다. 갱신은 일 1회 배치 + 검수 판정뿐 | 병합 결과가 멤버와 중복 저장 — 배치가 유일한 쓰기 주체라는 규율로 감당 |
| 실체 `id`를 승계·고정 | `/opportunities/{id}`가 SSG/ISR로 색인되고 `bookmark`가 이 id를 참조 — v1은 대표 교체로 id가 바뀌었다 | 이관 시 id 승계 + 북마크 리매핑 마이그레이션이 필요 |
| 소스를 CHECK가 아니라 `source_registry` 테이블로 | 소스 편입이 마이그레이션 ALTER 2회였다 | api-spec `source` enum 동기화는 여전히 문서 의무(DB가 못 잡는다) |
| `review_status` NOT NULL 4값(`not_required` 포함) | `NULL IN (...)`이 NULL이라 CHECK가 통과시키는 함정 제거 | 공공 행에도 의미 없는 값이 한 칸 들어간다 |
| `(source_code, external_id)` UNIQUE + UPSERT | 멱등성 DB 강제 | — |
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

**소스 명세 확정:** K-Startup(라이브 10건) ✔ / 기업마당 Bizinfo(공식 명세) ✔ / 온통청년(실데이터 10건) ✔ — **셋 다 스키마 변경 없이 수용**(설계 3회 검증). 비API 소스(CCEI·테크노파크 등)는 크롤링 영역으로 MVP 제외.

> **필드 매핑 표(§6·6-B·6-C)의 좌측 열 `opportunity`는 v2에서 `source_record`를 가리킨다.** 수집이
> 쓰는 대상이 관측 계층으로 바뀌었을 뿐 필드 매핑 자체는 그대로다(§2-B). `opportunity`(실체)는
> 수집이 아니라 병합 배치가 채운다.

**남은 확인(스키마 변경 아님):**
1. 더 많은 페이지로 각 소스의 category·지역·대상 값 전체 집합 확정.
2. `getBusinessInformation01`의 `biz_supt_bdgt_info`로 `support_amount` 보강 여부.
3. ~~출처 간 dedup~~ → **§6-D로 확정 설계 완료**(스코어링 임계 0.85·canonical 선정은 노출 가능성 → 출처 → 정보량 → id·페르소나 3단계). 남은 건 임계값 튜닝(실데이터로 오합치율 검증).
4. R&D(SMTECH·과기부)·중소벤처24: 기업마당과 중복 가능성 높음 → 중복률 실측 후 Phase 2 결정.
5. `screens.md`에서 노출 컬럼 확정 → eligibility_detail·apply_url·organization_type 표시 범위.
