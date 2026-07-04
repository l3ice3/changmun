package com.changmun.user.dto;

/** 현재 로그인 상태 — 비로그인이면 authenticated=false, 나머지 null. */
public record MeResponse(boolean authenticated, String email, String provider) {

  public static MeResponse anonymous() {
    return new MeResponse(false, null, null);
  }
}
