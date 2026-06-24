package com.changmun.glossary.dto;

import com.changmun.glossary.domain.GlossaryTerm;
import java.util.ArrayList;
import java.util.List;

/** GET /api/v1/glossary 응답 — 전체 용어 일괄 (api-spec.md §3). */
public record GlossaryResponse(List<GlossaryEntry> items) {

  public static GlossaryResponse from(List<GlossaryTerm> terms) {
    List<GlossaryEntry> items = new ArrayList<>();
    for (GlossaryTerm term : terms) {
      items.add(GlossaryEntry.from(term));
    }
    return new GlossaryResponse(items);
  }
}
