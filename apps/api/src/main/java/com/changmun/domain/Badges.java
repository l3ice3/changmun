package com.changmun.domain;

import java.util.ArrayList;
import java.util.List;

/** 배지 산출 — api-spec.md §0 배지 표의 유일한 구현 위치. 코드만 만들고 라벨은 프론트가 렌더한다. */
public final class Badges {

  private final List<BadgeCode> codes;

  private Badges(List<BadgeCode> codes) {
    this.codes = codes;
  }

  public static Badges of(OpportunityStatus status, Targeting targeting) {
    List<BadgeCode> collected = new ArrayList<>();
    if (targeting.requiresNoBusiness()) {
      collected.add(BadgeCode.NO_BIZ_REQUIRED);
    }
    if (status.isClosingSoon()) {
      collected.add(BadgeCode.CLOSING_SOON);
    }
    if (status.code() == StatusCode.ALWAYS_OPEN) {
      collected.add(BadgeCode.ALWAYS_OPEN);
    }
    if (targeting.isConditionUnknown()) {
      collected.add(BadgeCode.CONDITION_UNKNOWN);
    }
    return new Badges(collected);
  }

  public List<String> codes() {
    List<String> names = new ArrayList<>();
    for (BadgeCode code : codes) {
      names.add(code.name());
    }
    return names;
  }
}
