package com.changmun.user.dto;

/**
 * 프로필 이미지 응답 — 바이너리와 Content-Type. repository 프로젝션을 컨트롤러에 노출하지 않기 위한 운반체 (계층 규칙 — controller는
 * repository를 모른다).
 */
@SuppressWarnings({"PMD.ArrayIsStoredDirectly", "PMD.MethodReturnsInternalArray"})
// 이미지 바이트는 생성 즉시 응답으로만 흘러가는 단방향 운반체 — 방어적 복사(1MB)는 비용만 든다.
public record ProfileImageResponse(byte[] image, String contentType) {}
