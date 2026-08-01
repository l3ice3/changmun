package com.changmun.showcase.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 댓글 작성 요청 — 1000자 제한(스키마 VARCHAR(1000)과 일치). */
public record ShowcaseCommentRequest(
    @NotBlank(message = "댓글 내용을 입력해 주세요") @Size(max = 1000, message = "댓글은 1000자 이하로 입력해 주세요")
        String body) {}
