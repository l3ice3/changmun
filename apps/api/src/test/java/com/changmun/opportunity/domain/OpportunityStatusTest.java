package com.changmun.opportunity.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** status·dDay·closingSoon 산식 단위 테스트 — 유일한 정의는 api-spec.md §0 (AC-013). */
class OpportunityStatusTest {

  private static final LocalDate TODAY = LocalDate.of(2026, 6, 16);

  @Test
  @DisplayName("is_always_open이면 deadline과 무관하게 status=ALWAYS_OPEN, dDay=null이다")
  void alwaysOpenIgnoresDeadline() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, true, TODAY.minusDays(10));

    assertThat(status.code()).isEqualTo(StatusCode.ALWAYS_OPEN);
    assertThat(status.dDay()).isNull();
  }

  @Test
  @DisplayName("deadline이 오늘이면 status=OPEN, dDay=0이다 (경계)")
  void deadlineTodayIsOpenWithZeroDDay() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, TODAY);

    assertThat(status.code()).isEqualTo(StatusCode.OPEN);
    assertThat(status.dDay()).isZero();
  }

  @Test
  @DisplayName("deadline이 미래면 status=OPEN, dDay는 남은 일수다")
  void futureDeadlineIsOpenWithDayCount() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, TODAY.plusDays(3));

    assertThat(status.code()).isEqualTo(StatusCode.OPEN);
    assertThat(status.dDay()).isEqualTo(3);
  }

  @Test
  @DisplayName("deadline이 오늘 이전이면 status=CLOSED, dDay=null이다")
  void pastDeadlineIsClosed() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, TODAY.minusDays(1));

    assertThat(status.code()).isEqualTo(StatusCode.CLOSED);
    assertThat(status.dDay()).isNull();
  }

  @Test
  @DisplayName("deadline이 null이고 상시도 아니면 status=UNDATED, dDay=null이다 (기간 미상)")
  void noDeadlineAndNotAlwaysOpenIsUndated() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, null);

    assertThat(status.code()).isEqualTo(StatusCode.UNDATED);
    assertThat(status.dDay()).isNull();
  }

  @Test
  @DisplayName("OPEN이고 dDay가 7 이하면 closingSoon=true이다 (경계 7)")
  void closingSoonWhenSevenDaysLeft() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, TODAY.plusDays(7));

    assertThat(status.isClosingSoon()).isTrue();
  }

  @Test
  @DisplayName("OPEN이고 dDay가 8이면 closingSoon=false이다 (경계 7 초과)")
  void notClosingSoonWhenEightDaysLeft() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, TODAY.plusDays(8));

    assertThat(status.isClosingSoon()).isFalse();
  }

  @Test
  @DisplayName("ALWAYS_OPEN은 closingSoon=false이다")
  void alwaysOpenIsNotClosingSoon() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, true, null);

    assertThat(status.isClosingSoon()).isFalse();
  }

  @Test
  @DisplayName("dDay는 OPEN일 때만 존재한다 — 불변식 위반 생성은 차단된다")
  void dDayPresenceIsCoupledToOpen() {
    assertThatThrownBy(() -> new OpportunityStatus(StatusCode.CLOSED, 3))
        .isInstanceOf(IllegalArgumentException.class);
  }
}
