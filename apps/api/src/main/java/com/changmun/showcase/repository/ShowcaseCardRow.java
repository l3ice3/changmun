package com.changmun.showcase.repository;

import java.time.Instant;

/**
 * 리스트/주간용 카드 프로젝션 — 이미지 바이트를 싣지 않기 위해 엔티티 대신 사용. 별칭은 PG 소문자 접힘(case folding) 때문에 쿼리에서 반드시 쌍따옴표로
 * 감싼다.
 */
public interface ShowcaseCardRow {

  Long getId();

  String getName();

  String getTagline();

  String getCategory();

  String getMakerName();

  long getCheerCount();

  boolean getHasImage();

  Instant getApprovedAt();
}
