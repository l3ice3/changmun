package com.changmun.opportunity.domain;

/**
 * 페르소나 탭 → opportunity 타깃 컬럼 쿼리 신호 매핑 (api-spec.md §0, screens.md §3).
 *
 * <p>각 페르소나는 업력(stages) 또는 대상(audience) 한 축만 활성화한다. 비활성 축은 null = "이 축으로는 거르지 않음"(리포지토리 네이티브 쿼리의
 * `:param IS NULL` 분기 계약).
 */
public enum Persona {
  PRE_STARTUP(new String[] {"PRE_STARTUP"}, null),
  UNIV_STUDENT(null, "UNIV_STUDENT"),
  EARLY_STAGE(new String[] {"LT_1Y", "LT_2Y", "LT_3Y"}, null);

  private final String[] stages;
  private final String audience;

  Persona(String[] stages, String audience) {
    this.stages = stages;
    this.audience = audience;
  }

  public String[] stages() {
    if (stages == null) {
      return null;
    }
    return stages.clone();
  }

  public String audience() {
    return audience;
  }
}
