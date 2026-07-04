-- 서버측 찜 — data-model.md §8 bookmark. 로그인 사용자의 찜을 서버에 보관(기기 간 동기화).
-- app_user(V20260630_1000)에 이어 추가. opportunity·app_user FK는 ON DELETE CASCADE.
CREATE TABLE bookmark (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id        BIGINT NOT NULL REFERENCES app_user(id)    ON DELETE CASCADE,
    opportunity_id BIGINT NOT NULL REFERENCES opportunity(id) ON DELETE CASCADE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_bookmark UNIQUE (user_id, opportunity_id)
);
CREATE INDEX idx_bookmark_user ON bookmark (user_id);
