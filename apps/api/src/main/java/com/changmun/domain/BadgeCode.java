package com.changmun.domain;

/** 배지 코드 — 라벨 렌더는 프론트 책임 (api-spec.md §0). 서버는 코드만 응답에 싣는다. */
public enum BadgeCode {
  NO_BIZ_REQUIRED,
  CLOSING_SOON,
  ALWAYS_OPEN,
  CONDITION_UNKNOWN
}
