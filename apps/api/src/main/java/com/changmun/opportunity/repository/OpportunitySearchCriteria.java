package com.changmun.opportunity.repository;

import com.changmun.opportunity.domain.Persona;

/**
 * 리스트/검색 조회 필터 묶음 — 네이티브 쿼리 SpEL 바인딩(:#{#criteria.xxx})의 입력.
 *
 * <p>각 필터는 null이면 "그 축으로 거르지 않음"을 뜻한다(쿼리의 `:param IS NULL OR ...` 분기 계약). 서비스가 요청 파라미터에서 이 객체를
 * 조립한다. 생성자 인자 4개 제한을 지키기 위해 보조 필터는 {@link Filters}로 묶는다.
 */
@SuppressWarnings("PMD.TooManyFields") // 운반용 필터 묶음 — 인자 4개 제한 회피가 목적이다.
public final class OpportunitySearchCriteria {

  private final String[] stages;
  private final String audience;
  private final String region;
  private final String category;
  private final String source;
  private final String query;
  private final boolean onlyOpen;

  private OpportunitySearchCriteria(Persona persona, Filters filters) {
    this.stages = stagesOf(persona);
    this.audience = audienceOf(persona);
    this.region = filters.region();
    this.category = filters.category();
    this.source = filters.source();
    this.query = filters.query();
    this.onlyOpen = filters.onlyOpen();
  }

  /** persona가 null이면 페르소나 필터 없음(전체 탭). */
  public static OpportunitySearchCriteria of(Persona persona, Filters filters) {
    return new OpportunitySearchCriteria(persona, filters);
  }

  private static String[] stagesOf(Persona persona) {
    if (persona == null) {
      return null;
    }
    return persona.stages();
  }

  private static String audienceOf(Persona persona) {
    if (persona == null) {
      return null;
    }
    return persona.audience();
  }

  public String[] getStages() {
    if (stages == null) {
      return null;
    }
    return stages.clone();
  }

  public String getAudience() {
    return audience;
  }

  public String getRegion() {
    return region;
  }

  public String getCategory() {
    return category;
  }

  public String getSource() {
    return source;
  }

  /** 검색어는 LIKE 와일드카드(%, _)·escape 문자(\)를 리터럴로 이스케이프한다 — 입력이 패턴을 흔들지 않게 (AC-021). */
  public String getQuery() {
    return escapeLike(query);
  }

  public boolean isOnlyOpen() {
    return onlyOpen;
  }

  private static String escapeLike(String value) {
    if (value == null) {
      return null;
    }
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
  }

  /** 보조 필터(지역·카테고리·출처·검색어·진행상태) 운반용. */
  public record Filters(
      String region, String category, String source, String query, boolean onlyOpen) {}
}
