package com.changmun.repository;

import com.changmun.domain.Opportunity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 공고 조회 — Spring Data JPA 인터페이스 자체가 추상화다(수동 구현 금지).
 *
 * <p>모든 사용자 입력은 SpEL 파라미터 바인딩(문자열 조립 금지 — AC-021). 리스트/검색은 `is_canonical = true` 고정, `ids=` 조회만
 * 예외(강등돼도 유지 — AC-024). 정렬은 deadline ASC NULLS LAST(기본) / first_seen_at DESC(최신). 페르소나는 업력 코드 집합 배열
 * overlap(&&)으로 EARLY_STAGE 다중 코드를 한 번에 거른다.
 */
public interface OpportunityRepository extends JpaRepository<Opportunity, Long> {

  // NULL 바인드의 타입을 PostgreSQL이 추론하도록 모든 nullable 파라미터를 CAST로 감싼다
  // (`? IS NULL` 단독은 "could not determine data type" 유발). onlyOpen은 boolean이라 CAST 불필요.
  String FILTERS =
      """
        WHERE is_canonical = true
          AND (CAST(:#{#criteria.stages} AS text[]) IS NULL
               OR target_startup_stage && CAST(:#{#criteria.stages} AS text[]))
          AND (CAST(:#{#criteria.audience} AS text) IS NULL
               OR CAST(:#{#criteria.audience} AS text) = ANY(target_audience_type))
          AND (CAST(:#{#criteria.region} AS text) IS NULL
               OR region = CAST(:#{#criteria.region} AS text))
          AND (CAST(:#{#criteria.category} AS text) IS NULL
               OR category = CAST(:#{#criteria.category} AS text))
          AND (CAST(:#{#criteria.query} AS text) IS NULL
               OR title ILIKE '%' || CAST(:#{#criteria.query} AS text) || '%'
               OR summary ILIKE '%' || CAST(:#{#criteria.query} AS text) || '%')
          AND (:#{#criteria.onlyOpen} = FALSE
               OR is_always_open
               OR application_deadline >= CURRENT_DATE
               OR application_deadline IS NULL)
      """;

  String SELECT_BY_DEADLINE =
      "SELECT * FROM opportunity " + FILTERS + " ORDER BY application_deadline ASC NULLS LAST";

  String SELECT_BY_LATEST = "SELECT * FROM opportunity " + FILTERS + " ORDER BY first_seen_at DESC";

  String COUNT_FILTERED = "SELECT count(*) FROM opportunity " + FILTERS;

  @Query(value = SELECT_BY_DEADLINE, countQuery = COUNT_FILTERED, nativeQuery = true)
  Page<Opportunity> searchByDeadline(
      @Param("criteria") OpportunitySearchCriteria criteria, Pageable pageable);

  @Query(value = SELECT_BY_LATEST, countQuery = COUNT_FILTERED, nativeQuery = true)
  Page<Opportunity> searchByLatest(
      @Param("criteria") OpportunitySearchCriteria criteria, Pageable pageable);
}
