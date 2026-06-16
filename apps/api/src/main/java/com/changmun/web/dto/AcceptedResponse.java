package com.changmun.web.dto;

/** 행동 로그 적재 응답 — 202 { "accepted": true } (api-spec.md §4). */
public record AcceptedResponse(boolean accepted) {

  public static AcceptedResponse ok() {
    return new AcceptedResponse(true);
  }
}
