package com.changmun.opportunity.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 배지 코드 산출 단위 테스트 — 코드→라벨 매핑은 프론트, 서버는 코드만 (api-spec.md §0, AC-013). */
class BadgesTest {

  private static final LocalDate TODAY = LocalDate.of(2026, 6, 16);

  @Test
  @DisplayName("target_startup_stage에 PRE_STARTUP이 있으면 NO_BIZ_REQUIRED 배지가 붙는다")
  void preStartupYieldsNoBizRequired() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, TODAY.plusDays(30));
    Targeting targeting = Targeting.of(List.of("PRE_STARTUP"), List.of("GENERAL"));

    Badges badges = Badges.of(status, targeting);

    assertThat(badges.codes()).contains("NO_BIZ_REQUIRED");
  }

  @Test
  @DisplayName("마감임박(dDay<=7)이면 CLOSING_SOON 배지가 붙는다")
  void closingSoonYieldsBadge() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, TODAY.plusDays(3));
    Targeting targeting = Targeting.of(List.of("LT_1Y"), List.of("COMPANY"));

    Badges badges = Badges.of(status, targeting);

    assertThat(badges.codes()).contains("CLOSING_SOON");
  }

  @Test
  @DisplayName("상시모집이면 ALWAYS_OPEN 배지가 붙는다")
  void alwaysOpenYieldsBadge() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, true, null);
    Targeting targeting = Targeting.of(List.of("PRE_STARTUP"), null);

    Badges badges = Badges.of(status, targeting);

    assertThat(badges.codes()).contains("ALWAYS_OPEN");
  }

  @Test
  @DisplayName("페르소나 신호가 둘 다 없으면 CONDITION_UNKNOWN 배지가 붙는다 (AC-009)")
  void noTargetSignalYieldsConditionUnknown() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, TODAY.plusDays(30));
    Targeting targeting = Targeting.of(null, null);

    Badges badges = Badges.of(status, targeting);

    assertThat(badges.codes()).contains("CONDITION_UNKNOWN");
  }

  @Test
  @DisplayName("신호가 하나라도 있으면 CONDITION_UNKNOWN 배지는 붙지 않는다")
  void anyTargetSignalSuppressesConditionUnknown() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, TODAY.plusDays(30));
    Targeting targeting = Targeting.of(null, List.of("UNIV_STUDENT"));

    Badges badges = Badges.of(status, targeting);

    assertThat(badges.codes()).doesNotContain("CONDITION_UNKNOWN");
  }

  @Test
  @DisplayName("여유로운 PRE_STARTUP 공고는 NO_BIZ_REQUIRED만 갖는다 (임박·상시·미상 아님)")
  void comfortablePreStartupHasOnlyNoBizRequired() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, TODAY.plusDays(30));
    Targeting targeting = Targeting.of(List.of("PRE_STARTUP"), List.of("GENERAL", "UNIV_STUDENT"));

    Badges badges = Badges.of(status, targeting);

    assertThat(badges.codes()).containsExactly("NO_BIZ_REQUIRED");
  }

  @Test
  @DisplayName("AC-013: 오늘+3일 마감 + PRE_STARTUP은 NO_BIZ_REQUIRED와 CLOSING_SOON을 함께 갖는다")
  void ac013PreStartupClosingSoon() {
    OpportunityStatus status = OpportunityStatus.on(TODAY, false, TODAY.plusDays(3));
    Targeting targeting = Targeting.of(List.of("PRE_STARTUP"), List.of("GENERAL"));

    Badges badges = Badges.of(status, targeting);

    assertThat(badges.codes()).containsExactly("NO_BIZ_REQUIRED", "CLOSING_SOON");
  }
}
