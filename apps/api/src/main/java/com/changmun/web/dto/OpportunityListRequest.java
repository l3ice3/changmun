package com.changmun.web.dto;

import com.changmun.domain.Persona;
import com.changmun.domain.SortOrder;
import com.changmun.web.InvalidParameterException;
import java.util.Locale;

/**
 * 리스트/검색 요청 파라미터 바인딩 + 파싱 (api-spec.md §1). 검증은 파싱 접근자에서 수행해 잘못된 값을 {@link
 * InvalidParameterException}으로 던지고 전역 핸들러가 400 INVALID_PARAM으로 변환한다. page/size는 안전 범위로 보정한다(범위 초과
 * page는 에러가 아니라 빈 결과 — AC-014).
 */
@SuppressWarnings("PMD.TooManyFields") // 요청 파라미터 바인딩 묶음.
public class OpportunityListRequest {

  private static final String STATUS_OPEN = "open";
  private static final String STATUS_ALL = "all";
  private static final int MIN_QUERY_LENGTH = 2;
  private static final int MAX_PAGE_SIZE = 50;
  private static final int DEFAULT_PAGE_SIZE = 20;

  private String persona;
  private String region;
  private String category;
  private String status = STATUS_OPEN;
  private String query;
  private String sort = "deadline";
  private int page = 1;
  private int size = DEFAULT_PAGE_SIZE;

  public Persona persona() {
    if (isBlank(persona)) {
      return null;
    }
    return parsePersona(persona.trim());
  }

  public String region() {
    return blankToNull(region);
  }

  public String category() {
    return blankToNull(category);
  }

  public String searchTerm() {
    String trimmed = blankToNull(query);
    if (trimmed == null) {
      return null;
    }
    if (trimmed.length() < MIN_QUERY_LENGTH) {
      throw new InvalidParameterException("q", query);
    }
    return trimmed;
  }

  public boolean onlyOpen() {
    if (isBlank(status)) {
      return true;
    }
    String value = status.trim().toLowerCase(Locale.ROOT);
    if (value.equals(STATUS_ALL)) {
      return false;
    }
    if (value.equals(STATUS_OPEN)) {
      return true;
    }
    throw new InvalidParameterException("status", status);
  }

  public SortOrder sortOrder() {
    if (isBlank(sort)) {
      return SortOrder.DEADLINE;
    }
    String value = sort.trim().toLowerCase(Locale.ROOT);
    if (value.equals("latest")) {
      return SortOrder.LATEST;
    }
    if (value.equals("deadline")) {
      return SortOrder.DEADLINE;
    }
    throw new InvalidParameterException("sort", sort);
  }

  public int pageIndex() {
    return Math.max(0, page - 1);
  }

  public int pageSize() {
    return Math.min(MAX_PAGE_SIZE, Math.max(1, size));
  }

  private static Persona parsePersona(String value) {
    try {
      return Persona.valueOf(value);
    } catch (IllegalArgumentException invalid) {
      throw new InvalidParameterException("persona", value);
    }
  }

  private static String blankToNull(String value) {
    if (isBlank(value)) {
      return null;
    }
    return value.trim();
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  public void setPersona(String persona) {
    this.persona = persona;
  }

  public void setRegion(String region) {
    this.region = region;
  }

  public void setCategory(String category) {
    this.category = category;
  }

  public void setStatus(String status) {
    this.status = status;
  }

  public void setQ(String value) {
    this.query = value;
  }

  public void setSort(String sort) {
    this.sort = sort;
  }

  public void setPage(int page) {
    this.page = page;
  }

  public void setSize(int size) {
    this.size = size;
  }
}
