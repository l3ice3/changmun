package com.changmun.opportunity.domain;

import static java.time.temporal.ChronoUnit.DAYS;

import java.time.LocalDate;

/**
 * status·dDay·closingSoon 산식의 유일한 구현 위치 — api-spec.md §0 (AC-013).
 *
 * <p>불변식: dDay는 OPEN일 때만 존재한다. 생성자에서 불일치 상태를 차단해, 내부 분기는 항상 code로만 한다.
 */
public record OpportunityStatus(StatusCode code, Integer dDay) {

  private static final int CLOSING_SOON_DAYS = 7;

  public OpportunityStatus {
    if ((code == StatusCode.OPEN) != (dDay != null)) {
      throw new IllegalArgumentException("dDay는 OPEN일 때만 존재한다: " + code);
    }
  }

  public static OpportunityStatus on(LocalDate today, boolean alwaysOpen, LocalDate deadline) {
    if (alwaysOpen) {
      return new OpportunityStatus(StatusCode.ALWAYS_OPEN, null);
    }
    if (deadline == null) {
      return new OpportunityStatus(StatusCode.UNDATED, null);
    }
    if (deadline.isBefore(today)) {
      return new OpportunityStatus(StatusCode.CLOSED, null);
    }
    return new OpportunityStatus(StatusCode.OPEN, (int) DAYS.between(today, deadline));
  }

  public boolean isClosingSoon() {
    return code == StatusCode.OPEN && dDay <= CLOSING_SOON_DAYS;
  }
}
