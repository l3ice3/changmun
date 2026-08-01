package com.changmun.showcase.dto;

import java.time.Instant;

/**
 * 쇼케이스 댓글 응답 — 작성자는 마스킹 표시명(예: "ar***")만 싣는다(PII 최소). mine은 요청자 본인 댓글 여부(삭제 버튼 노출용). 프로젝션 변환·마스킹은
 * service가 한다.
 */
public record ShowcaseCommentResponse(
    Long id, String displayName, String body, boolean mine, Instant createdAt) {}
