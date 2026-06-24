package com.changmun.common.web;

/** 리소스 없음 — 전역 핸들러가 404 NOT_FOUND(RFC7807)로 변환한다 (api-spec.md §0, AC-016). */
public class NotFoundException extends RuntimeException {

  public NotFoundException(String detail) {
    super(detail);
  }
}
