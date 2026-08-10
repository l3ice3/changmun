package com.changmun.showcase.domain;

import com.changmun.common.web.InvalidParameterException;

/** 쇼케이스 리스트 정렬 — latest(기본) | cheers(응원순). 미지 값은 400(INVALID_PARAM). */
public enum ShowcaseSort {
  LATEST,
  CHEERS;

  public static ShowcaseSort from(String raw) {
    if (raw == null || raw.isBlank() || "latest".equals(raw)) {
      return LATEST;
    }
    if ("cheers".equals(raw)) {
      return CHEERS;
    }
    throw new InvalidParameterException("sort가 올바르지 않습니다: " + raw);
  }
}
