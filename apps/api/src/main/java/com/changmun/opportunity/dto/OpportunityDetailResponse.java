package com.changmun.opportunity.dto;

import com.changmun.glossary.domain.GlossaryTerm;
import com.changmun.opportunity.domain.Opportunity;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import java.time.LocalDate;
import java.util.List;

/**
 * 공고 상세 응답 — 리스트 필드 전부 + 상세 추가 필드 + matchedTerms·otherSources (api-spec.md §2).
 * 카드·계산·상세추가는 @JsonUnwrapped로 평탄화하고, 관계 배열도 펼쳐 최상위에 둔다.
 */
public final class OpportunityDetailResponse {

  private final OpportunityCard card;
  private final OpportunityComputed computed;
  private final OpportunityDetailExtra detail;
  private final OpportunityRelations relations;

  private OpportunityDetailResponse(
      OpportunityCard card,
      OpportunityComputed computed,
      OpportunityDetailExtra detail,
      OpportunityRelations relations) {
    this.card = card;
    this.computed = computed;
    this.detail = detail;
    this.relations = relations;
  }

  public static OpportunityDetailResponse from(
      Opportunity opportunity,
      LocalDate today,
      List<GlossaryTerm> matched,
      List<Opportunity> siblings) {
    return new OpportunityDetailResponse(
        OpportunityCard.from(opportunity),
        OpportunityComputed.from(opportunity, today),
        OpportunityDetailExtra.from(opportunity),
        OpportunityRelations.from(matched, siblings));
  }

  @JsonUnwrapped
  public OpportunityCard getCard() {
    return card;
  }

  @JsonUnwrapped
  public OpportunityComputed getComputed() {
    return computed;
  }

  @JsonUnwrapped
  public OpportunityDetailExtra getDetail() {
    return detail;
  }

  @JsonUnwrapped
  public OpportunityRelations getRelations() {
    return relations;
  }
}
