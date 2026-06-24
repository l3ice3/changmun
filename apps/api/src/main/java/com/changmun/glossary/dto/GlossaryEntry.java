package com.changmun.glossary.dto;

import com.changmun.glossary.domain.GlossaryTerm;

/** 용어 한 건 {term, description} — /glossary 항목이자 상세의 matchedTerms 항목 (api-spec.md §2·§3). */
public record GlossaryEntry(String term, String description) {

  public static GlossaryEntry from(GlossaryTerm term) {
    return new GlossaryEntry(term.getTerm(), term.getDescription());
  }
}
