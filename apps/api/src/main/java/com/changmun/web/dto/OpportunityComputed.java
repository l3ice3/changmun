package com.changmun.web.dto;

import com.changmun.domain.Badges;
import com.changmun.domain.Opportunity;
import com.changmun.domain.OpportunityStatus;
import com.changmun.domain.StatusCode;
import java.time.LocalDate;
import java.util.List;

/**
 * 서버 계산 필드 — status·dDay·closingSoon·badges (api-spec.md §0, AC-013). 프론트는 재계산 없이 이 값을 렌더만 한다.
 * {@code status}는 enum이라 Jackson이 코드명("OPEN")으로 직렬화한다.
 */
public record OpportunityComputed(
    StatusCode status, Integer dDay, boolean closingSoon, List<String> badges) {

  public static OpportunityComputed from(Opportunity opportunity, LocalDate today) {
    OpportunityStatus status = opportunity.statusOn(today);
    Badges badges = opportunity.badgesOn(today);
    return new OpportunityComputed(
        status.code(), status.dDay(), status.isClosingSoon(), badges.codes());
  }
}
