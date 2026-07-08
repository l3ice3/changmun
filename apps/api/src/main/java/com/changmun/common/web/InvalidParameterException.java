package com.changmun.common.web;

/** 잘못된 요청 파라미터 — 전역 핸들러가 400 INVALID_PARAM(RFC7807)으로 변환한다 (api-spec.md §0, AC-014). */
public class InvalidParameterException extends RuntimeException {

  public InvalidParameterException(String name, String value) {
    super("허용되지 않는 파라미터 값입니다: " + name + "=" + value);
  }

  /** 이름=값 형태가 아닌 자유 메시지용(업로드 검증 등). */
  public InvalidParameterException(String message) {
    super(message);
  }
}
