package com.changmun.showcase.dto;

/** 상세 응답의 반응 묶음(응원 수·내 응원·소유 여부) — 인자 나열 대신 운반체로 묶는다. */
public record ShowcaseReactions(long cheers, boolean cheeredByMe, boolean mine) {}
