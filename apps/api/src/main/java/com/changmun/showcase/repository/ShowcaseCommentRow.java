package com.changmun.showcase.repository;

import java.time.Instant;

/** 댓글 프로젝션 — 작성자 표시는 이메일 로컬파트(서비스에서 마스킹). 계정 원문은 응답에 싣지 않는다. */
public interface ShowcaseCommentRow {

  Long getId();

  Long getUserId();

  String getBody();

  String getEmailLocalPart();

  Instant getCreatedAt();
}
