package com.changmun.showcase.domain;

/** 쇼케이스 검수 상태 — 선검수 후게시(기획안 §3). APPROVED만 공개 지면에 노출된다. */
public enum ShowcaseStatus {
  PENDING,
  APPROVED,
  REJECTED
}
