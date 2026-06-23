# 데이터 한눈에 보기 (data-overview)

> 팀원이 **"무슨 데이터가, 어디서 와서, 어떻게 변환·정리되어, 어떤 모양으로 쌓이는지"** 큰 그림을 빠르게 잡기 위한 개요 문서다.
> ⚠️ **정확한 타입·enum 값·제약의 단일 진실은 [`data-model.md`](data-model.md)**(LOCKED). 여기선 *무엇을·왜·어떻게*에 집중하고, 정확한 값이 필요하면 그 문서를 본다.

---

## 0. 큰 그림 한 장

여러 정부 사이트의 흩어진 공고를 → **하나의 `opportunity` 테이블**로 정규화하고 중복을 묶어 모은다.

```
 [K-Startup API]  [기업마당 API]  [온통청년 API]      ← 출처 (현재 K-Startup 가동, 나머지 확장 예정)
        │              │              │
        └──────────────┴──────────────┘
                       ▼
              수집(fetch) + 정제(normalize)            ← 원본을 우리 표준 모양으로 변환
                       ▼
              중복 묶기(dedup)                          ← 같은 공고를 그룹으로, 대표 1개만 노출
                       ▼
              ┌─────────────────────┐
              │  opportunity 테이블  │                  ← 모든 출처가 공유하는 단일 원장
              └─────────────────────┘
                       ▼
                  서빙 API → 화면
```

**핵심 한 줄:** `opportunity` 테이블은 *K-Startup 전용이 아니라* 여러 출처 공용이고, 그래서 "출처 구분·중복 묶기" 같은 관리용 컬럼이 함께 들어있다.

---

## 1. 원본 데이터 한 건 (K-Startup 응답)

K-Startup이 주는 원본 JSON이 실제로 어떻게 생겼는지 — 검증용 표본 1건 전체. (이게 §2에서 우리 컬럼으로 어떻게 바뀌는지는 바로 아래에서 다룬다.)
```json
{
  "id": 1,                                              // 행 번호 (안 씀)
  "pbanc_sn": 177976,                                   // 공고 고유번호
  "biz_pbanc_nm": "2026 하반기 서울 AI 허브 입주기업 모집 공고\r\n",  // 공고명 (\r\n·공백 정리 대상)
  "pbanc_ctnt": "본 사업은 혁신적인 아이디어를 보유한 예비창업자의 사업화를 지원합니다.\r\n",  // 공고 내용(요약)
  "supt_biz_clsfc": "기술개발(R&amp;D)",                  // 지원분야 (HTML 엔티티 그대로 옴)
  "supt_regin": "서울",                                  // 지역
  "pbanc_ntrp_nm": "서울특별시",                          // 기관명
  "sprv_inst": "공공기관",                                // 기관 유형
  "biz_enyy": "예비창업자,1년미만",                        // 업력 (콤마 복수)
  "aply_trgt": "청소년,대학생,일반인,1인 창조기업",         // 신청 대상 (콤마 복수)
  "aply_trgt_ctnt": "예비창업자(사업자등록 이력이 없는 자) 및 업력 1년 미만 기업",  // 자격 설명(자유텍스트)
  "pbanc_rcpt_bgng_dt": "20260601",                     // 접수 시작 (YYYYMMDD)
  "pbanc_rcpt_end_dt": "20260619",                      // 접수 마감
  "detl_pg_url": "https://www.k-startup.go.kr/web/contents/bizpbanc-ongoing.do?schM=view&pbancSn=177976",  // 상세 페이지 URL(사용자 1차 링크)
  "biz_aply_url": null,                                 // 신청 URL (라이브 대개 null)
  "aply_mthd_onli_rcpt_istc": "[www.k-startup.go.kr](https://www.k-startup.go.kr/apply/177976)",  // 온라인 접수
  "biz_gdnc_url": null,                                 // 안내 URL
  "aply_mthd_fax_rcpt_istc": null,                      // 팩스 접수 (안 씀 → raw에만)
  "rcrt_prgs_yn": "Y",                                  // 모집 진행 여부
  "biz_trgt_age": "만 20세 이상 ~ 만 39세 이하",          // 연령 (저신호 → raw에만)
  "intg_pbanc_biz_nm": "서울 AI 허브 &#40;본관&#41;"      // 통합공고명 (안 씀 → raw에만)
}
```
> ⚠️ 실제 K-Startup API는 위보다 **더 많은 필드**(다른 신청방법 종류·담당자 연락처 등)를 준다. 위는 *검증용 표본 1건 전체*이고, 표본에 없는 필드까지 **전부 `raw`에 통째 보존**된다(§4·§7).

---

## 2. K-Startup 컬럼 → 우리 컬럼 (제공·설명·변환)

K-Startup이 주는 필드 중 **서비스에 쓰는 15개**를 우리 컬럼으로 변환한다.

| K-Startup 필드 | 의미 | → 우리 컬럼 | 변환 방법 |
|---|---|---|---|
| `pbanc_sn` | 공고 고유번호 | `external_id` | 숫자 → 문자열 |
| `biz_pbanc_nm` | 공고명 | `title` | HTML 디코딩·공백 정리 |
| `pbanc_ctnt` | 공고 내용 | `summary` | 〃 |
| `supt_biz_clsfc` | 지원분야 | `category` | 11종 표준 매핑, 미지 → `기타` |
| `supt_regin` | 지역 | `region` | 콤마 분리 → 시도 **배열** |
| `pbanc_ntrp_nm` | 기관명 | `organization` | 원문 그대로 |
| `sprv_inst` | 기관 유형 | `organization_type` | 원문 그대로 (표시용) |
| `biz_enyy` | 업력 | `target_startup_stage` | 콤마 분리 → 코드 **배열** |
| `aply_trgt` | 신청 대상 | `target_audience_type` | 콤마 분리 → 코드 **배열** |
| `aply_trgt_ctnt` | 자격 설명 | `eligibility_detail` | 원문 그대로 (표시용) |
| `pbanc_rcpt_bgng_dt` | 접수 시작 | `application_start_date` | `YYYYMMDD` → 날짜 |
| `pbanc_rcpt_end_dt` | 접수 마감 | `application_deadline` | `YYYYMMDD` → 날짜 |
| `detl_pg_url` | 상세 페이지 | `detail_url` | URL 정제 |
| `biz_aply_url` 외 2개 | 신청 링크 | `apply_url` | **폴백 체인**(첫 유효 URL) |
| `rcrt_prgs_yn` | 모집 여부(Y/N) | `source_status` | 원문 그대로 |

**공통 정제 규칙**
- **HTML 디코딩**: `기술개발(R&amp;D)` → `기술개발(R&D)`
- **공백 정리**: 앞뒤 공백·`\r\n` 제거, 빈 값은 NULL
- **날짜**: `YYYYMMDD` 8자리만 날짜로, 형식 다르면 NULL
- **URL 정제**: 마크다운 래핑 해제, 스킴(`https://`) 보정, URL 아니면 NULL
- **배열화**: `"청소년,대학생"` → `{YOUTH, UNIV_STUDENT}` (콤마 분리 후 코드 변환, 중복 제거)

> 정확한 enum 값(11종 분야, 시도 목록, 업력·대상 코드)은 [`data-model.md` §7](data-model.md) 참조.

---

## 3. 컬럼의 두 종류 — 필터용 vs 표시용

이 구분이 **"왜 어떤 건 코드로 바꾸고 어떤 건 원문 그대로 두는가"** 를 설명한다.

| 종류 | 무엇 | 컬럼 | 왜 |
|---|---|---|---|
| **필터용** | 사용자가 골라내는 축 | `category` · `region` · `target_startup_stage` · `target_audience_type` | 정확히 일치시켜야 해서 **표준 코드로 변환** (예: "서울특별시"→`서울`) |
| **표시용** | 화면에 보여주기만 | `organization` · `organization_type` · `eligibility_detail` | 거를 일이 없으니 **원문 그대로** 저장 (코드화하면 정보만 손실) |

**예시로 보면 명확:**
- `region`은 *필터*라 `서울특별시`·`서울` 표기를 `서울`로 통일하고 배열로 둠 → 지역 필터가 정확히 동작.
- `organization_type`은 *표시*라 `공공기관`·`지자체`·`중앙부처`를 **원문 그대로** 둠 → 코드(PUBLIC 등)로 바꿔봤자 화면엔 손해.

> 새 컬럼을 추가할 때 **"이건 거르는 축인가, 보여주는 값인가"** 부터 정하면 변환 방식이 자동으로 결정된다.

---

## 4. K-Startup이 주지만 우리가 안 쓰는 컬럼

이 필드들은 컬럼으로 올리지 않고 **`raw`에만 통째 보존**한다.

| 안 쓰는 필드 | 이유 |
|---|---|
| `id` | 응답 행 번호일 뿐 (고유 ID는 `pbanc_sn`) |
| `biz_trgt_age` | 연령 — 거의 모든 공고가 "전 연령"이라 신호가 약함 |
| `aply_mthd_fax_rcpt_istc` 등 | 팩스·우편 접수 안내 — 신청 링크로 못 씀 |
| `aply_mthd_eml_rcpt_istc` | 이메일 접수 — 암호화 블롭이라 무의미 |
| `prch_cnpl_no` | 담당자 연락처 — 개인정보성 |
| `intg_pbanc_biz_nm` · `intg_*` | 통합공고 관련 — 현재 미사용 |

> K-Startup은 30개 이상 필드를 주는데, 그중 **쓰는 15개만 컬럼**으로 올리고 **나머지는 전부 `raw`에 살아있다**. 나중에 필요해지면 재수집 없이 `raw`에서 꺼내 쓸 수 있다.

---

## 5. 우리가 새로 만든 컬럼 (K-Startup이 안 주는 것)

대부분 **여러 출처를 한 테이블에 모으려고** 우리가 붙인 관리용 컬럼이다. *K-Startup만 보면 과해 보이지만*, 기업마당·온통청년을 합치면 꼭 필요하다.

| 컬럼 | 무엇 | 왜 필요 (멀티소스 맥락) |
|---|---|---|
| `id` | 우리 PK (자동 증가) | 내부 식별자 |
| `source` | 출처 (`k-startup` 등) | external_id는 *출처 안에서만* 고유 → 출처가 다르면 같은 번호가 충돌할 수 있어 네임스페이스로 구분 |
| `dedup_group_id` | 중복 그룹 ID | 출처 간 같은 공고를 묶는 표시 (§6) |
| `is_canonical` | 그룹 대표 여부 | 리스트는 **대표만** 노출 → 중복이 화면에 안 쌓임 |
| `is_always_open` | 상시 모집 여부 | K-Startup은 항상 `false`. **온통청년(상시 정책 多)** 때문에 필요 |
| `support_amount` | 지원 금액 | 현재 항상 NULL (K-Startup 공고 API가 금액을 안 줌) |
| `raw` | 원본 전체(JSONB) | 가공 전 원본 보존 (§7) |
| `first_seen_at` | 최초 수집 시각 | "최신순" 정렬·추적 |
| `updated_at` | 마지막 갱신 시각 | 변경 추적 |

> 패턴: **K-Startup이 주는 건 "그 공고에 대한 사실", 우리가 만드는 건 "어떻게 관리·중복제거·추적할지".**

---

## 6. 중복 합치기(dedup) — "합친다"의 진짜 의미

같은 공고가 여러 번 들어올 수 있다. 예: 같은 "예비창업패키지"가 **K-Startup에도, 기업마당에도** 올라와 → DB에 2행.

**"합친다"는 행을 지우거나 하나로 병합하는 게 아니다.** 같은 공고로 **묶고, 대표 하나만 화면에 보여주는** 것이다.

```
합치기 전:  [K-Startup 행]   [기업마당 행]      ← DB에 2행 (그대로 유지)
합친 후:    같은 dedup_group_id 부여
            K-Startup 행 = is_canonical=true   ← 대표 (화면에 이것만)
            기업마당 행   = is_canonical=false  ← 숨김 (상세의 "다른 출처"로만 노출)
```

| | DB 행 | 화면 리스트 |
|---|---|---|
| 합치기 전 | 2개 | 2개 (중복) |
| 합친 후 | **2개 그대로** | **1개** (대표만) |

- **리스트·검색은 `is_canonical = true`만 조회** → 중복 제거된 화면.
- **같은 공고인지 판정**은 제목·기관·기간 유사도(0.85 이상)로. *지역*은 "겹치는지"를 추가로 봐서, 지역이 다르면(예: `{서울}` vs `{부산}`) 합치지 않는다.
- 숨겨진 행은 사라지지 않고, 상세의 "이 공고는 기업마당에도 있어요" 같은 표시나 찜 조회에 쓰인다.

> 자세한 점수·규칙은 [`data-model.md` §6-D](data-model.md) 참조.

---

## 7. `raw` 보존 + 멱등성 — 안전장치 두 개

**① `raw` (원본 통째 보존)**
- K-Startup 응답을 **가공 없이 JSONB로 통째** 저장한다.
- 이유: (a) 추적·감사, (b) **나중에 새 필드가 필요해지면 재수집 없이 `raw`에서 꺼내** 쓸 수 있음.

**② 멱등성 (같은 공고 중복 적재 방지)**
- `(source, external_id)`에 **UNIQUE 제약** + **UPSERT**(있으면 갱신, 없으면 삽입).
- 그래서 **매일 배치를 다시 돌려도** 같은 공고가 중복으로 쌓이지 않고 갱신된다.
- 이것 때문에 `external_id`(= `pbanc_sn`)가 중요하다 — 이게 "이미 있는 공고인지" 판별의 열쇠.

---

## 8. NULL을 어떻게 읽어야 하나 (조심)

**NULL을 막연히 "모름"으로 읽지 말 것.** 우리 데이터에서 NULL은 *두 가지 결측이 합쳐진* 것이다:

1. **소스가 그 필드를 안 줌** (예: 기업마당엔 신청대상 필드가 없음 → `target_audience_type` NULL)
2. **줬지만 우리 표준에 없어서 버림** (예: `supt_regin`에 예상 밖 값 → `region`에 못 넣고 NULL)
   - ②는 수집 때 **`unknown_values` 로그에 남는다** → "왜 NULL인지" 추적 가능.

**읽는 규칙:** 필터 컬럼이 NULL이면 = *"이 공고를 그 축으로 분류할 수 없음"* 이다. **"매칭된다/제외된다"로 단정하지 말 것.** (예: `target_audience_type`이 NULL인 공고를 "대학생 대상이 아니다"라고 단정하면 안 됨 — 그냥 *모르는 것*이다.)

**더 안전한 대안 — 명시 값(센티넬):**
- `category`는 NULL을 안 쓰고 **`기타`라는 명시 값**으로 미지를 표현한다 → 모호함이 없다.
- 즉 "모름"을 *값으로 박는* 방식이 NULL보다 안전하다. 다른 필터 축에도 확대할지는 스키마 합의 사항(향후 개선 후보).

| 컬럼 | 미지/결측 표현 |
|---|---|
| `category` | **`기타`** (명시 값) |
| `region` · `target_startup_stage` · `target_audience_type` | **NULL** + 수집 로그 |

---

## 부록 — 더 깊이 볼 곳
- **정확한 스키마·타입·enum 값**: [`data-model.md`](data-model.md) (LOCKED, 단일 진실)
- **수집·정규화·dedup 코드**: `apps/ingest/`
- **서빙 API 응답 형태**: [`api-spec.md`](api-spec.md)
