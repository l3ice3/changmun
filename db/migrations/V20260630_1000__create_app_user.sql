-- 로그인(OAuth) 사용자 — data-model.md §8의 app_user 스키마 구현.
-- 로그인은 원래 Out-of-Scope였으나 In-Scope로 확장(팀 3인 합의) 반영.
-- §8은 파일명이 V2__였으나 V2는 이미 점유(glossary·event_log)라 타임스탬프 버전으로 적재.
-- PII 최소 수집: 이메일 + provider 식별만(액세스 토큰·프로필 등은 저장하지 않는다).
-- 서버측 찜(bookmark)은 opportunity FK가 기존 테스트의 TRUNCATE와 얽혀, 서버-찜 동기화 기능 PR에서 함께 추가한다.

CREATE TABLE app_user (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email        VARCHAR(255) NOT NULL,
    provider     VARCHAR(40)  NOT NULL,
    provider_uid VARCHAR(200) NOT NULL,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_provider UNIQUE (provider, provider_uid)
);
