-- V1: opportunity 테이블 — docs/data-model.md §2 [LOCKED] 의 SQL 그대로.
-- 이 파일 수정 = 스키마 변경 = 3인 합의 필수.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE opportunity (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

    source                  VARCHAR(40)  NOT NULL,
    external_id             VARCHAR(64)  NOT NULL,

    title                   TEXT         NOT NULL,
    summary                 TEXT,
    category                VARCHAR(40),
    region                  VARCHAR(40),
    organization            TEXT,
    organization_type       VARCHAR(20),
    support_amount          TEXT,

    -- 타깃팅 (예비창업자·대학생 친화 필터 = 차별점)
    target_startup_stage    TEXT[],   -- {PRE_STARTUP, LT_1Y, LT_2Y, LT_3Y, LT_5Y, LT_7Y, LT_10Y}
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
CREATE INDEX idx_opportunity_region   ON opportunity (region);
CREATE INDEX idx_opportunity_stage    ON opportunity USING gin (target_startup_stage);
CREATE INDEX idx_opportunity_audience ON opportunity USING gin (target_audience_type);
CREATE INDEX idx_opportunity_title_trgm ON opportunity USING gin (title gin_trgm_ops);
CREATE INDEX idx_opportunity_canonical ON opportunity (is_canonical) WHERE is_canonical;  -- 서빙은 대표만 조회
CREATE INDEX idx_opportunity_dedup_grp ON opportunity (dedup_group_id);
