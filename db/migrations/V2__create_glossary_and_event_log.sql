-- V2: glossary + event_log — data-model.md에 DDL 미정의, 계약 문서에서 도출:
--   glossary  ← api-spec.md §3 (term, description) + PRD §7.1 "glossary는 독립(텍스트 매칭)"
--   event_log ← api-spec.md §4 (clientId UUID, eventType 화이트리스트, payload JSONB, occurredAt)
--               + PRD §7.1 "append-only, opportunity와 약결합(FK 강제 안 함)" + FR-007 (PII 금지)
-- data-model.md 갱신은 팀 합의 후 별도 진행.

CREATE TABLE glossary (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    term        TEXT        NOT NULL,
    description TEXT        NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_glossary_term UNIQUE (term)
);

CREATE TABLE event_log (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    client_id   UUID        NOT NULL,            -- 익명 클라이언트 UUID (개인정보 아님)
    event_type  VARCHAR(40) NOT NULL,            -- 화이트리스트 검증은 API 계층 책임 (api-spec §4)
    payload     JSONB,                           -- 허용 키만 — API 계층에서 화이트리스트 검증 (AC-027)
    occurred_at TIMESTAMPTZ NOT NULL,            -- 클라이언트 발생 시각 (생략 시 서버가 수신 시각으로 채움)
    received_at TIMESTAMPTZ NOT NULL DEFAULT now()
    -- opportunity와 약결합: FK 없음 (PRD §7.1). append-only — UPDATE/DELETE 없음
);

CREATE INDEX idx_event_log_type_time ON event_log (event_type, occurred_at);
CREATE INDEX idx_event_log_occurred  ON event_log (occurred_at);
