package com.changmun.showcase.dto;

import java.time.Instant;

/** 내 등록물 응답 — 검수 상태·거절 사유 포함(본인에게만). 프로젝션 변환은 service가 한다. */
public record ShowcaseMineResponse(
    Long id,
    String name,
    String tagline,
    String category,
    String status,
    String rejectReason,
    long cheers,
    Instant createdAt) {}
