-- 쇼케이스 — 창업자 제품 홍보의 장 (docs/기획안-쇼케이스.md §5, 2026-08-01 사장님 승인).
-- 선검수 후게시: status PENDING → APPROVED(공개) / REJECTED(사유 기록).
-- 이 status는 쇼케이스 검수 상태로, 공고의 "저장 금지 status(마감 산식)"와 무관한 별개 컬럼.
-- 이미지: 프로필 이미지와 동일하게 1MB 제한 + DB(BYTEA) 저장(별도 스토리지 없이).
-- PII 최소: 공개되는 것은 제품 정보와 등록 시 입력한 팀명(maker_name)뿐 — 계정 정보 비노출.

CREATE TABLE showcase_product (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    owner_user_id BIGINT       NOT NULL REFERENCES app_user (id),
    name          VARCHAR(80)  NOT NULL,
    tagline       VARCHAR(120) NOT NULL,
    description   TEXT         NOT NULL,
    url           VARCHAR(500),
    image         BYTEA,
    image_type    VARCHAR(30),
    category      VARCHAR(30)  NOT NULL,  -- APP_WEB | COMMERCE | CONTENT | LOCAL | ETC
    maker_name    VARCHAR(60)  NOT NULL,  -- 등록 시 입력한 팀명(표시명)
    status        VARCHAR(10)  NOT NULL DEFAULT 'PENDING',  -- PENDING | APPROVED | REJECTED
    reject_reason VARCHAR(200),
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    approved_at   TIMESTAMPTZ,
    updated_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT ck_showcase_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- 리스트(승인작 + 최신·주간)와 소유자 조회 경로.
CREATE INDEX idx_showcase_status_approved_at ON showcase_product (status, approved_at DESC);
CREATE INDEX idx_showcase_owner ON showcase_product (owner_user_id);

-- 응원 — 1인 1제품 1응원(복합 PK). 무결제 수요 신호(추후 펀딩 검증 데이터).
CREATE TABLE showcase_cheer (
    product_id BIGINT      NOT NULL REFERENCES showcase_product (id) ON DELETE CASCADE,
    user_id    BIGINT      NOT NULL REFERENCES app_user (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (product_id, user_id)
);

-- 댓글 — 후검수(신고는 MVP에선 이메일 접수). 소프트 삭제(deleted_at)로 흔적 유지.
CREATE TABLE showcase_comment (
    id         BIGINT        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    product_id BIGINT        NOT NULL REFERENCES showcase_product (id) ON DELETE CASCADE,
    user_id    BIGINT        NOT NULL REFERENCES app_user (id),
    body       VARCHAR(1000) NOT NULL,
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_showcase_comment_product ON showcase_comment (product_id, created_at);

-- 검수(선검수 후게시) 운영 SQL — 관리자 UI 없이 DB 수동(기획안 §9):
--   승인: UPDATE showcase_product SET status='APPROVED', approved_at=now(), updated_at=now() WHERE id=?;
--   거절: UPDATE showcase_product SET status='REJECTED', reject_reason='사유', updated_at=now() WHERE id=?;
