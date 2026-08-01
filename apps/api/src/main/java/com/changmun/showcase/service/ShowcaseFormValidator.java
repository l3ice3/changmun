package com.changmun.showcase.service;

import com.changmun.common.web.InvalidParameterException;
import com.changmun.showcase.domain.ShowcaseCategory;
import com.changmun.showcase.domain.ShowcaseContent;
import com.changmun.showcase.dto.ShowcaseForm;
import java.io.IOException;
import java.util.Set;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

/**
 * 쇼케이스 폼 검증 + 운반 값 객체 변환 — 길이는 스키마(V20260801_1100)와 1:1, 이미지는 프로필과 동일 정책(1MB·JPEG/PNG/WebP). 멀티파트
 * 한도(application.yml)와 별개로 최종 검증한다(다중 방어).
 */
@Component
public class ShowcaseFormValidator {

  private static final int NAME_MAX = 80;
  private static final int TAGLINE_MAX = 120;
  private static final int DESCRIPTION_MAX = 5000;
  private static final int URL_MAX = 500;
  private static final int MAKER_NAME_MAX = 60;
  private static final int MAX_IMAGE_BYTES = 1_048_576;
  private static final Set<String> ALLOWED_IMAGE_TYPES =
      Set.of("image/jpeg", "image/png", "image/webp");

  public ShowcaseContent validate(ShowcaseForm form) {
    validateText(form.name(), NAME_MAX, "제품 이름");
    validateText(form.tagline(), TAGLINE_MAX, "한 줄 소개");
    validateText(form.description(), DESCRIPTION_MAX, "설명");
    validateText(form.makerName(), MAKER_NAME_MAX, "팀명");
    validateUrl(form.url());
    ShowcaseCategory category = ShowcaseCategory.from(form.category());
    byte[] image = readImage(form.image());
    String imageType = imageTypeOf(image, form.image());
    return new ShowcaseContent(
        form.name().strip(),
        form.tagline().strip(),
        form.description().strip(),
        normalizeUrl(form.url()),
        category,
        form.makerName().strip(),
        image,
        imageType);
  }

  private void validateText(String value, int max, String label) {
    if (value == null || value.isBlank()) {
      throw new InvalidParameterException(label + "을(를) 입력해 주세요");
    }
    if (value.strip().length() > max) {
      throw new InvalidParameterException(label + "은(는) " + max + "자 이하로 입력해 주세요");
    }
  }

  private void validateUrl(String url) {
    if (url == null || url.isBlank()) {
      return;
    }
    String stripped = url.strip();
    if (stripped.length() > URL_MAX) {
      throw new InvalidParameterException("링크는 " + URL_MAX + "자 이하로 입력해 주세요");
    }
    validateUrlScheme(stripped);
  }

  private void validateUrlScheme(String stripped) {
    if (stripped.startsWith("https://")) {
      return;
    }
    if (stripped.startsWith("http://")) {
      return;
    }
    throw new InvalidParameterException("링크는 http(s)://로 시작해야 합니다");
  }

  private String imageTypeOf(byte[] image, MultipartFile file) {
    if (image == null) {
      return null;
    }
    return file.getContentType();
  }

  private String normalizeUrl(String url) {
    if (url == null || url.isBlank()) {
      return null;
    }
    return url.strip();
  }

  private byte[] readImage(MultipartFile image) {
    if (image == null || image.isEmpty()) {
      return null;
    }
    validateImageMeta(image);
    try {
      return image.getBytes();
    } catch (IOException exception) {
      throw new InvalidParameterException("이미지 파일을 읽지 못했습니다. 다시 시도해 주세요");
    }
  }

  private void validateImageMeta(MultipartFile image) {
    if (image.getSize() > MAX_IMAGE_BYTES) {
      throw new InvalidParameterException("이미지는 1MB 이하만 업로드 가능합니다");
    }
    String contentType = image.getContentType();
    if (contentType == null || !ALLOWED_IMAGE_TYPES.contains(contentType)) {
      throw new InvalidParameterException("지원하지 않는 이미지 형식입니다 (JPEG·PNG·WebP)");
    }
  }
}
