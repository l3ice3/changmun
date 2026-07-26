package com.changmun.opportunity.dto;

import com.changmun.opportunity.domain.Opportunity;
import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;
import java.util.List;

/**
 * 카드/리스트 공통 원천 필드(계산값 제외) — api-spec.md §1. {@link OpportunityResponse}에 @JsonUnwrapped로 펼쳐져 평탄한
 * JSON이 된다.
 */
@SuppressWarnings("PMD.TooManyFields") // api-spec §1 카드 필드 1:1 운반용.
public record OpportunityCard(
    Long id,
    String source,
    String title,
    String organization,
    String category,
    List<String> region,
    LocalDate applicationStartDate,
    LocalDate applicationDeadline,
    @JsonProperty("isAlwaysOpen") boolean alwaysOpen,
    List<String> targetStartupStage,
    List<String> targetAudienceType,
    String eligibilityDetail,
    String supportAmount,
    Long maxSupportAmount,
    String detailUrl) {

  public static OpportunityCard from(Opportunity opportunity) {
    return new OpportunityCard(
        opportunity.getId(),
        opportunity.getSource(),
        opportunity.getTitle(),
        opportunity.getOrganization(),
        opportunity.getCategory(),
        opportunity.getRegion(),
        opportunity.getApplicationStartDate(),
        opportunity.getApplicationDeadline(),
        opportunity.isAlwaysOpen(),
        opportunity.getTargetStartupStage(),
        opportunity.getTargetAudienceType(),
        opportunity.getEligibilityDetail(),
        opportunity.servedSupportAmount(),
        opportunity.getMaxSupportAmount(),
        opportunity.getDetailUrl());
  }
}
