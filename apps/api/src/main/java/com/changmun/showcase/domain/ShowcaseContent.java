package com.changmun.showcase.domain;

/**
 * 쇼케이스 등록/수정 내용 운반 값 객체 — 폼 필드가 많아 인자를 묶는다(rules-core 리팩터링 트리거). 검증(길이·이미지 형식)은 서비스 계층에서 끝난 뒤 들어온다.
 * image가 null이면 "이미지 변경 없음".
 */
public record ShowcaseContent(
    String name,
    String tagline,
    String description,
    String url,
    ShowcaseCategory category,
    String makerName,
    byte[] image,
    String imageType) {}
