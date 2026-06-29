package com.changmun.opportunity.dto;

/** 홈 지표 — 진행 중·오늘 뜬·마감임박 공고 수 (canonical 기준). 계산값 미저장, 조회 시 count. */
public record StatsResponse(long open, long newToday, long closingSoon) {}
