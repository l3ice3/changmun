-- 마이페이지 프로필 이미지 (팀 3인 합의로 스코프 확장 — PRD §3.2 각주, data-model §8 갱신)
-- 1MB 이하로 서비스가 제한하므로 별도 스토리지 없이 DB(BYTEA)에 저장한다.
-- profile_image_type: image/jpeg·image/png·image/webp 중 하나(서비스 계층에서 검증).
ALTER TABLE app_user
  ADD COLUMN profile_image BYTEA,
  ADD COLUMN profile_image_type VARCHAR(30);
