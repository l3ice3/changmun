package com.changmun.domain;

import java.util.List;

/**
 * 페르소나 타깃 신호(업력·대상)의 일급 컬렉션. 신호 유무 판단을 객체에 묻는다(Tell, Don't Ask).
 *
 * <p>NULL/빈 배열은 "조건 미상"으로 동일 취급한다 (data-model.md §6-D, AC-009).
 */
public final class Targeting {

  private static final String NO_BUSINESS_STAGE = "PRE_STARTUP";

  private final List<String> startupStages;
  private final List<String> audienceTypes;

  private Targeting(List<String> startupStages, List<String> audienceTypes) {
    this.startupStages = startupStages;
    this.audienceTypes = audienceTypes;
  }

  public static Targeting of(List<String> startupStages, List<String> audienceTypes) {
    return new Targeting(normalize(startupStages), normalize(audienceTypes));
  }

  private static List<String> normalize(List<String> codes) {
    if (codes == null) {
      return List.of();
    }
    return List.copyOf(codes);
  }

  public boolean requiresNoBusiness() {
    return startupStages.contains(NO_BUSINESS_STAGE);
  }

  public boolean isConditionUnknown() {
    return startupStages.isEmpty() && audienceTypes.isEmpty();
  }

  public List<String> startupStages() {
    return startupStages;
  }

  public List<String> audienceTypes() {
    return audienceTypes;
  }
}
