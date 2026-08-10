package com.changmun.showcase.dto;

import org.springframework.web.multipart.MultipartFile;

/**
 * 쇼케이스 등록/수정 멀티파트 폼 (api-spec §6). 필드 검증(길이·필수·이미지)은 서비스가 수행 — 멀티파트 바인딩이라 @Valid 대신 서비스 검증으로
 * 통일한다(프로필 이미지와 같은 방식).
 */
public record ShowcaseForm(
    String name,
    String tagline,
    String description,
    String url,
    String category,
    String makerName,
    MultipartFile image) {}
