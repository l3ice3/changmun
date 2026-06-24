package com.changmun.opportunity.domain;

/** 공고 진행 상태 — api-spec.md §0. 저장하지 않고 마감일 기준으로 조회 시 계산한다. */
public enum StatusCode {
  OPEN,
  CLOSED,
  ALWAYS_OPEN,
  UNDATED
}
