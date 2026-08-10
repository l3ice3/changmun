package com.changmun.showcase.dto;

/** 응원 토글 응답 — 토글 후 상태(내 응원 여부·총 응원 수). */
public record ShowcaseCheerResponse(boolean cheered, long cheers) {}
