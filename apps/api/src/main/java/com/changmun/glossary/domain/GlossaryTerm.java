package com.changmun.glossary.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;

/** 용어 사전 항목 — db/migrations/V2 glossary 테이블과 1:1 (api-spec.md §3). */
@Entity
@Table(name = "glossary")
@Getter
public class GlossaryTerm {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "term")
  private String term;

  @Column(name = "description")
  private String description;

  protected GlossaryTerm() {
    // JPA 전용
  }

  public GlossaryTerm(String term, String description) {
    this.term = term;
    this.description = description;
  }
}
