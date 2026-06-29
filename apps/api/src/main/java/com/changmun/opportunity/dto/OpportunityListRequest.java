package com.changmun.opportunity.dto;

import com.changmun.common.web.InvalidParameterException;
import com.changmun.opportunity.domain.Persona;
import com.changmun.opportunity.domain.SortOrder;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.web.bind.annotation.BindParam;

/**
 * 리스트/검색 요청 파라미터 — 불변 record. 쿼리 키는 {@link BindParam}으로 raw 컴포넌트에 바인딩하고, 파싱·검증은 접근자에서 수행해 잘못된 값을
 * {@link InvalidParameterException}으로 던진다(전역 핸들러가 400 INVALID_PARAM으로 변환). 검증을 생성자가 아닌 접근자에서 하는 이유:
 * 바인딩 시점이 아니라 사용 시점에 검증해 기존 동작(범위 초과 page는 에러가 아니라 빈 결과 — AC-014)을 보존한다.
 * 기본값(status=open·sort=deadline·page=1·size=20)은 컴포넌트가 null일 때 접근자가 적용한다.
 */
@SuppressWarnings("PMD.TooManyFields") // 요청 파라미터 바인딩 묶음(record 컴포넌트).
public record OpportunityListRequest(
    @BindParam("persona") String personaParam,
    @BindParam("region") String regionParam,
    @BindParam("category") String categoryParam,
    @BindParam("source") String sourceParam,
    @BindParam("status") String statusParam,
    @BindParam("q") String queryParam,
    @BindParam("ids") String idsParam,
    @BindParam("sort") String sortParam,
    @BindParam("page") Integer pageParam,
    @BindParam("size") Integer sizeParam) {

  private static final String STATUS_OPEN = "open";
  private static final String STATUS_ALL = "all";
  private static final int MIN_QUERY_LENGTH = 2;
  private static final int MAX_PAGE_SIZE = 50;
  private static final int DEFAULT_PAGE_SIZE = 20;
  private static final int MAX_BOOKMARK_IDS = 50;
  private static final Set<String> VALID_SOURCES = Set.of("k-startup", "bizinfo", "ontong-youth");

  public Persona persona() {
    if (isBlank(personaParam)) {
      return null;
    }
    return parsePersona(personaParam.trim());
  }

  public String region() {
    return blankToNull(regionParam);
  }

  public String category() {
    return blankToNull(categoryParam);
  }

  /** 출처 필터 — k-startup·bizinfo·ontong-youth만 허용, 그 외 값은 400 INVALID_PARAM. */
  public String source() {
    if (isBlank(sourceParam)) {
      return null;
    }
    String value = sourceParam.trim().toLowerCase(Locale.ROOT);
    if (!VALID_SOURCES.contains(value)) {
      throw new InvalidParameterException("source", sourceParam);
    }
    return value;
  }

  public String searchTerm() {
    String trimmed = blankToNull(queryParam);
    if (trimmed == null) {
      return null;
    }
    if (trimmed.length() < MIN_QUERY_LENGTH) {
      throw new InvalidParameterException("q", queryParam);
    }
    return trimmed;
  }

  public boolean onlyOpen() {
    if (isBlank(statusParam)) {
      return true;
    }
    String value = statusParam.trim().toLowerCase(Locale.ROOT);
    if (value.equals(STATUS_ALL)) {
      return false;
    }
    if (value.equals(STATUS_OPEN)) {
      return true;
    }
    throw new InvalidParameterException("status", statusParam);
  }

  public SortOrder sortOrder() {
    if (isBlank(sortParam)) {
      return SortOrder.DEADLINE;
    }
    String value = sortParam.trim().toLowerCase(Locale.ROOT);
    if (value.equals("latest")) {
      return SortOrder.LATEST;
    }
    if (value.equals("deadline")) {
      return SortOrder.DEADLINE;
    }
    throw new InvalidParameterException("sort", sortParam);
  }

  public boolean isBookmarkQuery() {
    return !isBlank(idsParam);
  }

  /** 찜 조회 id 목록 — 요청 순서 보존, 최대 50개, 비숫자는 400 (api-spec.md §1). */
  public Long[] bookmarkIds() {
    String[] tokens = idsParam.split(",");
    if (tokens.length > MAX_BOOKMARK_IDS) {
      throw new InvalidParameterException("ids", idsParam);
    }
    List<Long> parsed = new ArrayList<>();
    for (String token : tokens) {
      addId(parsed, token);
    }
    return parsed.toArray(new Long[0]);
  }

  public int pageIndex() {
    if (pageParam == null) {
      return 0;
    }
    return Math.max(0, pageParam - 1);
  }

  public int pageSize() {
    if (sizeParam == null) {
      return DEFAULT_PAGE_SIZE;
    }
    return Math.min(MAX_PAGE_SIZE, Math.max(1, sizeParam));
  }

  private static void addId(List<Long> parsed, String token) {
    String trimmed = token.trim();
    if (trimmed.isEmpty()) {
      return;
    }
    parsed.add(parseId(trimmed));
  }

  private static Long parseId(String token) {
    try {
      return Long.valueOf(token);
    } catch (NumberFormatException invalid) {
      throw new InvalidParameterException("ids", token);
    }
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
}
