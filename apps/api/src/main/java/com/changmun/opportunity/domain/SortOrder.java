package com.changmun.opportunity.domain;

/** 리스트 정렬 기준 — api-spec.md §0. deadline=마감임박순(기본), latest=최신순(first_seen_at DESC). */
public enum SortOrder {
  DEADLINE,
  LATEST
}
