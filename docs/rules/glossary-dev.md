# glossary-dev.md — 개발자용 표준 용어 (동의어 금지)

> 세 명(AI)이 같은 개념을 제각각 부르면 코드 일관성이 무너진다.
> **코드 식별자(클래스·변수·필드·경로)는 아래 표준어만 쓴다. 동의어를 새로 만들지 않는다.**
> ⚠️ **값(enum 멤버·컬럼 목록)의 단일 진실은 `data-model.md`·`api-spec.md`다.** 이 문서는 그 값을 베끼지 않고 "어느 단어를 쓰는가"만 고정한다(부패 방지).
> 참고: 사용자 노출용 "용어 사전 기능"(`GET /api/glossary`)과는 다른 것. 이건 개발 식별자 합의표다.

## 표준어 (코드 식별자)
| 개념 | 표준어 | 한글 | 쓰지 말 것 |
|---|---|---|---|
| 지원사업/공고 1건 | `opportunity` | 공고 | `program`, `business`, `support`, `project`, `item` |
| 출처(수집원) | `source` | 소스 | `provider`, `site` — 값은 api-spec §0(`k-startup`·`bizinfo`·`ontong-youth`) |
| 소스 원본 고유 ID | `externalId` / `external_id` | 외부 ID | `sourceId`, `originId` |
| 그룹 대표 여부 | `isCanonical` / `is_canonical` | 대표 | `isPrimary`, `isMain`, `representative` |
| 중복 병합 | `dedup` | 중복 제거 | `merge`, `dupcheck` |
| 원본 전체 보존 | `raw` | 원본 | `rawData`, `payload`, `original` (가공·요약 저장 금지) |
| 마감일 | `applicationDeadline`(API) / `application_deadline`(DB) | 마감일 | `deadline`, `endDate`, `dueDate` |
| 상태(계산값) | `status` | 상태 | 저장 금지 — api-spec §0 산식으로 **서버 계산**. 값: `OPEN`·`CLOSED`·`ALWAYS_OPEN`·`UNDATED` |
| 남은 일수(계산값) | `dDay` | 디데이 | `daysLeft`, `remainDays` |
| 마감임박(계산값) | `closingSoon` | 마감임박 | `isUrgent`, `closeSoon` |
| 배지(계산값) | `badges` | 배지 | 값·라벨은 api-spec §0 표 (`NO_BIZ_REQUIRED`·`CLOSING_SOON`·`ALWAYS_OPEN`·`CONDITION_UNKNOWN`) |
| 페르소나 | `persona` | 페르소나 | 값: `PRE_STARTUP`·`UNIV_STUDENT`·`EARLY_STAGE` (api-spec §0) |
| 창업 단계(필터) | `targetStartupStage` / `target_startup_stage` | 업력 | `stage`, `phase` — 값은 data-model |
| 신청 대상(필터) | `targetAudienceType` / `target_audience_type` | 신청대상 | `audience`, `applicant` — 값은 data-model |
| 분야 | `category` | 카테고리 | `field`, `genre` — 값은 data-model §7(11종+기타) |
| 지역 | `region` | 지역 | `area`, `location` |
| 행동 로그 | `event` / `event_log` | 이벤트 | `track`, `analytics` — 익명 UUID + payload 화이트리스트만(PII 금지) |

## 규칙
1. 클래스·메서드·변수·DB 컬럼·API 경로 모두 표준어를 쓴다. (예: `OpportunityController`, `/api/opportunities`, `opportunityId`)
2. 한글 용어는 사용자 노출 텍스트(에러 메시지 등)에, 영어 표준어는 코드 식별자에.
3. **신호 없으면 NULL** — 페르소나·필터 값을 억지로 채우지 않는다(절대규칙 8). `null` 자체가 "조건 미상"이라는 의미다.
4. 표에 없는 새 개념이 필요하면 임의 명명하지 말고, 이 표에 추가 제안 + 계약 문서 용어와 맞춘다.
5. 약어는 통용되는 것만: `id`, `dto`, `api`, `url`. 도메인어(`opportunity`)는 줄이지 않는다(`oppt`, `op` 금지).
