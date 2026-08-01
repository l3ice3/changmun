package com.changmun.showcase.dto;

import java.time.Instant;

/**
 * 쇼케이스 카드(리스트·주간) — 이미지는 바이트 대신 hasImage로, 본문은 상세에서만. 리포지토리 프로젝션 → 카드 변환은 service가 한다(계층 규칙 — dto는
 * repository를 모른다).
 */
public record ShowcaseCardResponse(
    Long id,
    String name,
    String tagline,
    String category,
    String makerName,
    long cheers,
    boolean hasImage,
    Instant approvedAt) {}
