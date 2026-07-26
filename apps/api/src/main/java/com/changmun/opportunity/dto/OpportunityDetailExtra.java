package com.changmun.opportunity.dto;

import com.changmun.opportunity.domain.Opportunity;

/**
 * 상세 전용 추가 필드 — api-spec.md §2. {@link OpportunityDetailResponse}에 @JsonUnwrapped로 펼쳐진다.
 * supportAmount·maxSupportAmount는 리스트 카드 필드로 승격돼 {@link OpportunityCard}가 싣는다(FR-009).
 */
public record OpportunityDetailExtra(String summary, String organizationType, String applyUrl) {

  public static OpportunityDetailExtra from(Opportunity opportunity) {
    return new OpportunityDetailExtra(
        opportunity.getSummary(), opportunity.getOrganizationType(), opportunity.getApplyUrl());
  }
}
