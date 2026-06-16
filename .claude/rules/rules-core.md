---
paths:
  - "apps/api/**"
---

# 코딩 규칙 — apps/api 상시 (rules-core.md)

> **apps/api 작업 시 자동 로드된다**(path-scoped rule). Java 코딩의 상시 압축본 — 자주 어기고 짧게 표현되는 규칙만 담는다.
> 더 깊이 필요할 때 발췌 참조: 상세·이유(원칙) `docs/rules/rules-full.md` · **구체 코드 예시(정답 형태) `.claude/rules/api.md §코드 예시`** · 테스트 `docs/rules/testing.md` · 저장/트랜잭션/멱등 `docs/rules/persistence.md` · 식별자 표준어 `docs/rules/glossary-dev.md`.
> 커밋 전 `cd apps/api && ./gradlew check`(checkstyle+pmd+test) 통과 필수 — 실패 시 머지 불가.

## 스타일 (MUST)
- indent depth ≤ 2 / 메서드 ≤ 20라인 / 메서드 인자 ≤ 4
- `else`·`switch`-`case`·삼항 연산자 금지 → early return으로 평탄화
- 축약·약어 금지. 이름은 의도를 드러낸다(길어지면 책임 과다 신호)
- 매직 넘버·매직 스트링 금지 → 상수/설정으로. 정책 값(dDay 임박 7일, dedup 임계 0.85 등)은 이름 붙인 상수

## 객체지향 (MUST)
- Tell, Don't Ask — 데이터를 꺼내 판단하지 말고 객체에 묻는다
- 디미터 법칙 — `a.getB().getC()` 체이닝 금지
- 캡슐화 — 외부가 내부 결정에 의존하지 않게
- 배열 대신 컬렉션 / 일급 컬렉션 사용
- 변경 여지 없는 상태는 불변
- "없음"을 null로 표현하지 않고 별도 객체로
- (SHOULD) 의미 있는 원시값·문자열만 포장 (운반용은 제외)

## 클래스/책임 (MUST)
- 인스턴스 변수 ≤ 5, 엔티티는 작게
- 변경 이유가 다르면 분리 / 기능 묶음 2개↑이면 클래스 분리

## 리팩터링 트리거 (이 3개만 기억)
- 인자 3개↑ → **객체로 묶기**
- 같은 타입 분기 2곳↑ → **다형성 전환** (새 타입=새 클래스로 끝나게)
- 한 변경이 3곳↑ 전파 → **책임 재분배**

## 계층 (MUST)
- 도메인은 Repository 인터페이스 너머만 의존
- Service 외 객체는 Repository를 모른다
- Controller는 위임만, 로직 최소화

## 테스트 (MUST)
- TDD. public 메서드(getter 제외)는 행위 완결성 기준으로 테스트
- 도메인=단위 / Service·Repo=통합(주 기반) / Controller=E2E
- 단순 위임 Controller·이미 검증된 메서드는 재검증 안 함
- mock/fake 남발 금지

## 우선순위
컨벤션/규칙 → 역할 분리 → 세부 로직
