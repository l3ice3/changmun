package com.changmun.opportunity.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.changmun.common.web.InvalidParameterException;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 지원금 필터 파라미터 파싱 — 허용 값·400 경계 (AC-033). */
class OpportunityListRequestTest {

  private static OpportunityListRequest amountRequest(String hasAmount, String minAmount) {
    return new OpportunityListRequest(
        null, null, null, null, null, null, hasAmount, minAmount, null, null, null, null);
  }

  @Test
  @DisplayName("hasAmount는 true/false만 허용하고 생략하면 필터 없음이다")
  void hasAmountParsesBooleanOrDefaultsToNoFilter() {
    assertThat(amountRequest("true", null).requireAmount()).isTrue();
    assertThat(amountRequest("false", null).requireAmount()).isFalse();
    assertThat(amountRequest(null, null).requireAmount()).isFalse();
  }

  @Test
  @DisplayName("hasAmount에 true/false 외 값은 400 INVALID_PARAM이다 (AC-033)")
  void invalidHasAmountThrows() {
    assertThatThrownBy(() -> amountRequest("yes", null).requireAmount())
        .isInstanceOf(InvalidParameterException.class);
  }

  @Test
  @DisplayName("minAmount는 0 이상 정수를 원 단위로 파싱하고 생략하면 하한 없음이다")
  void minAmountParsesNonNegativeWon() {
    assertThat(amountRequest(null, "50000000").minAmount()).isEqualTo(50_000_000L);
    assertThat(amountRequest(null, "0").minAmount()).isZero();
    assertThat(amountRequest(null, null).minAmount()).isNull();
  }

  @Test
  @DisplayName("minAmount에 비숫자·음수는 400 INVALID_PARAM이다 (AC-033)")
  void invalidMinAmountThrows() {
    assertThatThrownBy(() -> amountRequest(null, "abc").minAmount())
        .isInstanceOf(InvalidParameterException.class);
    assertThatThrownBy(() -> amountRequest(null, "-1").minAmount())
        .isInstanceOf(InvalidParameterException.class);
  }
}
