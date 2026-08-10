---
paths:
  - "apps/web/**"
---

# rules/web.md — apps/web (Next.js + TypeScript)

> SSG/ISR 프론트 — SEO가 핵심 획득 엔진. 근거: `docs/screens.md`, `docs/api-spec.md`, PRD FR-003~007.

## 구조
```
src/
  app/                 # App Router
    page.tsx           # S1 탐색 홈(히어로 + 출처별 둘러보기) — 리스트는 S3로 분리(2026-07-04 IA)
    opportunities/[id]/page.tsx   # S2 상세 — SSG/ISR (revalidate = 수집 주기와 동기, 일 1회)
    search/            # S3 공고 탐색·검색(페르소나 탭 + 필터 + 리스트) — ?page=N URL 유지
    bookmarks/         # S4 (클라이언트 전용)
  components/          # OpportunityCard, BrowseSection, FilterBar(지원 대상 포함), Badge, GlossaryTerm, EmptyState
  lib/
    api.ts             # api-spec.md 타입 그대로 (응답 타입 수동 정의, 필드명 일치)
    bookmarks.ts       # localStorage (시크릿 모드 폴백 — AC-022)
    events.ts          # fire-and-forget 로깅 (실패 무시 — AC-026)
```

## 규칙
1. **서버 계산값 렌더만**: status·dDay·closingSoon·badges를 클라이언트에서 재계산 금지 (AC-013 코드리뷰 항목). 날짜 연산 코드가 프론트에 있으면 안 됨.
2. **배지 라벨 매핑은 한 곳에**: `NO_BIZ_REQUIRED→사업자 불필요`, `CLOSING_SOON→마감임박`, `ALWAYS_OPEN→상시모집`, `CONDITION_UNKNOWN→조건 미상`.
3. **페이지네이션은 페이지 번호 + URL 반영**(`?page=N`) — SEO 색인용. 무한스크롤 금지 (CC-07).
4. **SEO 필수**: 상세 페이지 title/description 메타, sitemap.xml, 시맨틱 마크업. 마감 공고도 200 렌더 + "마감" 표기 (AC-018).
5. **카피 가드레일**: "신청 자격이 됩니다 / 합격 여부는 별개". 금지 문구 "받을 수 있" (AC-015 grep 검증 대상).
6. 빈 상태 UI 필수: S1·S3·S4 각각 정의된 문구 + 다음 행동 유도 (CC-02).
7. 로깅은 절대 UX를 막지 않음 — await 금지, 에러 무시 (AC-026).
8. 데스크톱 우선 + 반응형. 다국어는 만들지 않음(Out-of-Scope). 나이트(다크) 모드는 지원 — `html.dark`에서 `@theme` 색 토큰 재정의 + 사이드바 하단 `ThemeToggle`(localStorage `theme`, FOUC 방지 head 스크립트). 컴포넌트는 토큰만 쓰고 다크용 분기 하드코딩 금지(스크림 등 항상-어두움이 필요한 곳만 `bg-black/*` 같은 고정색 허용).
9. 이벤트 payload에 개인 식별 정보 넣지 않음 — 허용 키만 (api-spec §4).
10. **ISR 24h 전제 = "상태 변경은 일 1회 배치뿐"**. FR-011 민간 검수는 이 전제를 깬다(사람이 배치 주기 밖에서 승인·반려·강등) → 검수 판정 시 해당 공고의 **캐시를 즉시 무효화**해야 한다(PRD FR-011 9항). 무효화 없이는 강등된 공고의 **틀린 마감일이 최대 하루 노출**돼 가드레일 2가 웹에서 무력화된다. 구현 시 on-demand revalidation 라우트가 필요(현재 레포에 없음).
    - **공고 fetch에는 공통 캐시 태그를 달고 태그 단위로 무효화**한다. 경로 나열은 반드시 빠뜨린다 — 공고는 상세·`/search`뿐 아니라 **홈(`/`)의 페르소나·출처·분야·지역 섹션**에도 `fetchOpportunities()`로 실린다.
    - **무효화 라우트는 인증 필수**(공유 시크릿, env로만 — 레포 커밋 금지). 미인증·불일치는 무효화 없이 401/403. 태그 전체를 날리는 공개 경로라 무인증이면 외부에서 ISR을 상시 비워 origin에 부하를 밀어 넣을 수 있다.
11. **`SOURCE_LABELS`는 api-spec `source` enum과 항상 같은 집합**이어야 한다. `sourceLabel()`이 `?? source`로 폴백하므로 누락돼도 조용히 통과하고 **카드에 `asan-nanum` 같은 내부 값이 노출**된다. `SOURCE_OPTIONS`가 여기서 파생되므로 누락된 출처는 **필터에서도 사라진다**. enum이 늘면 라벨도 같은 PR에서 늘린다(FR-011 민간 4종 — PRD FR-011 10항).
