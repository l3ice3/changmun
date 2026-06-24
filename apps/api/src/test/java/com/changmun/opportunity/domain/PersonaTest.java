package com.changmun.opportunity.domain;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 페르소나 → 쿼리 신호(업력 코드 집합 / 대상 코드) 매핑 — api-spec.md §0, screens.md §3. */
class PersonaTest {

  @Test
  @DisplayName("예비창업자는 업력 PRE_STARTUP만 거르고 대상 필터는 없다")
  void preStartupFiltersStageOnly() {
    assertThat(Persona.PRE_STARTUP.stages()).containsExactly("PRE_STARTUP");
    assertThat(Persona.PRE_STARTUP.audience()).isNull();
  }

  @Test
  @DisplayName("초기창업자는 업력 LT_1Y·LT_2Y·LT_3Y 집합으로 거른다")
  void earlyStageFiltersThreeStages() {
    assertThat(Persona.EARLY_STAGE.stages()).containsExactly("LT_1Y", "LT_2Y", "LT_3Y");
    assertThat(Persona.EARLY_STAGE.audience()).isNull();
  }

  @Test
  @DisplayName("대학생은 대상 UNIV_STUDENT만 거르고 업력 필터는 없다")
  void univStudentFiltersAudienceOnly() {
    assertThat(Persona.UNIV_STUDENT.stages()).isNull();
    assertThat(Persona.UNIV_STUDENT.audience()).isEqualTo("UNIV_STUDENT");
  }
}
