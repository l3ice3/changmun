package com.changmun.web.dto;

import com.changmun.domain.Opportunity;
import com.fasterxml.jackson.annotation.JsonUnwrapped;
import java.time.LocalDate;

/**
 * 공고 리스트 항목 응답 — 원천 카드 필드({@link OpportunityCard})와 계산 필드({@link
 * OpportunityComputed})를 @JsonUnwrapped로 한 평면 객체로 직렬화한다(api-spec.md §1). 17필드 record 1개의 from()이
 * 메서드 길이 제한을 넘기 때문에 두 묶음으로 나눠 조립한다.
 */
public final class OpportunityResponse {

  private final OpportunityCard card;
  private final OpportunityComputed computed;

  private OpportunityResponse(OpportunityCard card, OpportunityComputed computed) {
    this.card = card;
    this.computed = computed;
  }

  public static OpportunityResponse from(Opportunity opportunity, LocalDate today) {
    return new OpportunityResponse(
        OpportunityCard.from(opportunity), OpportunityComputed.from(opportunity, today));
  }

  @JsonUnwrapped
  public OpportunityCard getCard() {
    return card;
  }

  @JsonUnwrapped
  public OpportunityComputed getComputed() {
    return computed;
  }
}
