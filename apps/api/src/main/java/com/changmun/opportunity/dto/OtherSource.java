package com.changmun.opportunity.dto;

import com.changmun.opportunity.domain.Opportunity;

/** dedup 그룹 내 다른 출처 게재 — {source, detailUrl} (api-spec.md §2 otherSources). */
public record OtherSource(String source, String detailUrl) {

  public static OtherSource from(Opportunity opportunity) {
    return new OtherSource(opportunity.getSource(), opportunity.getDetailUrl());
  }
}
