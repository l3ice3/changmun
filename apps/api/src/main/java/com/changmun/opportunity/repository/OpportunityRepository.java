package com.changmun.opportunity.repository;

import com.changmun.opportunity.domain.Opportunity;
import java.util.List;
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
               OR region @> ARRAY[CAST(:#{#criteria.region} AS text)]::text[])
          AND (CAST(:#{#criteria.category} AS text) IS NULL
               OR category = CAST(:#{#criteria.category} AS text))
          AND (CAST(:#{#criteria.query} AS text) IS NULL
               OR title ILIKE '%' || CAST(:#{#criteria.query} AS text) || '%' ESCAPE '\\'
               OR summary ILIKE '%' || CAST(:#{#criteria.query} AS text) || '%' ESCAPE '\\')
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

  /** 같은 dedup 그룹의 다른 출처(자기 자신 제외) — 상세의 otherSources용 (api-spec.md §2). */
  @Query("SELECT o FROM Opportunity o WHERE o.dedupGroupId = :groupId AND o.id <> :selfId")
  List<Opportunity> findGroupSiblings(@Param("groupId") Long groupId, @Param("selfId") Long selfId);

  /**
   * 찜 조회 — 요청 순서 보존(array_position), 없는 id는 누락(에러 아님 — AC-023). is_canonical 무관(강등돼도 유지 — AC-024).
   * 다른 필터 무시.
   */
  @Query(
      value =
          """
          SELECT * FROM opportunity
          WHERE id = ANY(CAST(:ids AS bigint[]))
          ORDER BY array_position(CAST(:ids AS bigint[]), id)
          """,
      nativeQuery = true)
  List<Opportunity> findByIdsInOrder(@Param("ids") Long[] ids);

  /** 진행 중(canonical, status=open) 공고 수 — 홈 지표용. */
  @Query(
      value =
          """
          SELECT count(*) FROM opportunity
          WHERE is_canonical
            AND (is_always_open OR application_deadline >= CURRENT_DATE OR application_deadline IS NULL)
          """,
      nativeQuery = true)
  long countOpen();

  /** 오늘 수집된(canonical, first_seen_at가 오늘) 공고 수. */
  @Query(
      value =
          "SELECT count(*) FROM opportunity WHERE is_canonical AND first_seen_at >= CURRENT_DATE",
      nativeQuery = true)
  long countNewToday();

  /** 마감임박(canonical, OPEN이며 dDay 0~7) 공고 수. */
  @Query(
      value =
          """
          SELECT count(*) FROM opportunity
          WHERE is_canonical AND NOT is_always_open
            AND application_deadline >= CURRENT_DATE
            AND application_deadline <= CURRENT_DATE + 7
          """,
      nativeQuery = true)
  long countClosingSoon();
}
