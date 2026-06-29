package com.changmun.opportunity.repository;

/** 홈 지표 네이티브 집계 결과(인터페이스 프로젝션) — 세 값을 한 스냅샷에서 같이 조회한다. */
public interface StatsView {
  long getOpen();

  long getNewToday();

  long getClosingSoon();
}
