package com.changmun.glossary.domain;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** 용어 사전 일급 컬렉션 — 본문에서 등재 용어를 등장 순서로 추리는 책임을 가진다 (FR-004, AC-015). */
public final class Glossary {

  private final List<GlossaryTerm> terms;

  public Glossary(List<GlossaryTerm> terms) {
    this.terms = List.copyOf(terms);
  }

  public List<GlossaryTerm> matchIn(String text) {
    if (text == null || text.isBlank()) {
      return List.of();
    }
    List<GlossaryTerm> matched = new ArrayList<>();
    for (GlossaryTerm term : terms) {
      if (text.contains(term.getTerm())) {
        matched.add(term);
      }
    }
    matched.sort(Comparator.comparingInt(term -> text.indexOf(term.getTerm())));
    return matched;
  }
}
