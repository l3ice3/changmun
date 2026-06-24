package com.changmun.glossary.domain;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 용어 사전 매칭 단위 테스트 — 본문에 등장한 등재 용어만, 등장 순서로 추린다 (FR-004, AC-015). */
class GlossaryTest {

  private static final GlossaryTerm UPLEOK = new GlossaryTerm("업력", "사업자등록 후 지난 기간");
  private static final GlossaryTerm FUNDING = new GlossaryTerm("사업화자금", "사업화에 쓰도록 주는 돈");
  private static final GlossaryTerm STUDENT = new GlossaryTerm("대학생", "대학에 다니는 사람");

  private final Glossary glossary = new Glossary(List.of(UPLEOK, FUNDING, STUDENT));

  @Test
  @DisplayName("본문에 등장한 용어만 등장 순서대로 매칭한다")
  void matchesTermsInOrderOfAppearance() {
    List<GlossaryTerm> matched = glossary.matchIn("업력 3년 미만 기업에 사업화자금을 지원합니다");

    assertThat(matched).extracting(GlossaryTerm::getTerm).containsExactly("업력", "사업화자금");
  }

  @Test
  @DisplayName("등재 용어가 본문에 없으면 빈 목록이다")
  void returnsEmptyWhenNoTermAppears() {
    List<GlossaryTerm> matched = glossary.matchIn("관련 용어가 전혀 없는 문장입니다");

    assertThat(matched).isEmpty();
  }

  @Test
  @DisplayName("본문이 null이면 빈 목록이다")
  void returnsEmptyForNullText() {
    assertThat(glossary.matchIn(null)).isEmpty();
  }
}
