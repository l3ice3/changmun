package com.changmun.user.service;

import com.changmun.common.web.InvalidParameterException;
import com.changmun.common.web.NotFoundException;
import com.changmun.user.dto.ProfileImageResponse;
import com.changmun.user.repository.AppUserRepository;
import com.changmun.user.repository.ProfileImageRow;
import java.util.Set;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 마이페이지 프로필 이미지 — 1MB 이하·이미지 형식(JPEG·PNG·WebP)만 허용. 저장은 app_user 컬럼(BYTEA, 스토리지 없이 DB — 마이그레이션
 * V20260708_1000). 멀티파트 한도(application.yml 1MB)와 별개로 서비스가 최종 검증한다(다중 방어).
 */
@Service
public class ProfileImageService {

  private static final int MAX_IMAGE_BYTES = 1_048_576;
  private static final Set<String> ALLOWED_IMAGE_TYPES =
      Set.of("image/jpeg", "image/png", "image/webp");

  private final AppUserRepository appUserRepository;

  public ProfileImageService(AppUserRepository appUserRepository) {
    this.appUserRepository = appUserRepository;
  }

  @Transactional(readOnly = true)
  public ProfileImageResponse find(Long userId) {
    ProfileImageRow row =
        appUserRepository
            .findProfileImage(userId)
            .orElseThrow(() -> new NotFoundException("설정된 프로필 이미지가 없습니다"));
    return new ProfileImageResponse(row.getImage(), row.getContentType());
  }

  @Transactional
  public void update(Long userId, byte[] image, String contentType) {
    validate(image, contentType);
    int updatedRows = appUserRepository.updateProfileImage(userId, image, contentType);
    if (updatedRows == 0) {
      throw new NotFoundException("사용자를 찾을 수 없습니다");
    }
  }

  @Transactional
  public void remove(Long userId) {
    appUserRepository.clearProfileImage(userId);
  }

  private void validate(byte[] image, String contentType) {
    validateSize(image);
    validateType(contentType);
  }

  private void validateSize(byte[] image) {
    if (image == null || image.length == 0) {
      throw new InvalidParameterException("이미지 파일이 비어 있습니다");
    }
    if (image.length > MAX_IMAGE_BYTES) {
      throw new InvalidParameterException("프로필 이미지는 1MB 이하만 업로드 가능합니다");
    }
  }

  private void validateType(String contentType) {
    if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType)) {
      throw new InvalidParameterException("지원하지 않는 이미지 형식입니다 (JPEG·PNG·WebP)");
    }
  }
}
