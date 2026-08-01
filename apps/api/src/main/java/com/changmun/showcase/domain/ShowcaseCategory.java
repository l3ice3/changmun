package com.changmun.showcase.domain;

import com.changmun.common.web.InvalidParameterException;

/** 쇼케이스 카테고리 — 기획안 §9 확정 enum. 미지 값은 400(INVALID_PARAM). */
public enum ShowcaseCategory {
  APP_WEB,
  COMMERCE,
  CONTENT,
  LOCAL,
  ETC;

  public static ShowcaseCategory from(String raw) {
    for (ShowcaseCategory category : values()) {
      if (category.name().equals(raw)) {
        return category;
      }
    }
    throw new InvalidParameterException("category가 올바르지 않습니다: " + raw);
  }
}
