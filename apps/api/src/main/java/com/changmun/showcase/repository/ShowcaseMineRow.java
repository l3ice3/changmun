package com.changmun.showcase.repository;

import java.time.Instant;

/** 내 등록물 프로젝션 — 검수 상태·거절 사유 포함(본인에게만 보이는 정보). */
public interface ShowcaseMineRow {

  Long getId();

  String getName();

  String getTagline();

  String getCategory();

  String getStatus();

  String getRejectReason();

  long getCheerCount();

  Instant getCreatedAt();
}
