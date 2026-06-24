package com.changmun.opportunity.dto;

import com.changmun.glossary.domain.GlossaryTerm;
import com.changmun.glossary.dto.GlossaryEntry;
import com.changmun.opportunity.domain.Opportunity;
import java.util.ArrayList;
import java.util.List;

/**
 * 상세의 관계 필드 — matchedTerms·otherSources (api-spec.md §2). {@link
 * OpportunityDetailResponse}에 @JsonUnwrapped로 펼쳐져 두 배열이 최상위에 놓인다. 매칭 0개·그룹 없음이면 각각 빈 배열.
 */
public record OpportunityRelations(
    List<GlossaryEntry> matchedTerms, List<OtherSource> otherSources) {

  public static OpportunityRelations from(List<GlossaryTerm> matched, List<Opportunity> siblings) {
    List<GlossaryEntry> terms = new ArrayList<>();
    for (GlossaryTerm term : matched) {
      terms.add(GlossaryEntry.from(term));
    }
    List<OtherSource> sources = new ArrayList<>();
    for (Opportunity sibling : siblings) {
      sources.add(OtherSource.from(sibling));
    }
    return new OpportunityRelations(terms, sources);
  }
}
