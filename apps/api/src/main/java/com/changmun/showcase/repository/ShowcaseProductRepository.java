package com.changmun.showcase.repository;

import com.changmun.showcase.domain.ShowcaseProduct;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 쇼케이스 제품 조회 — 공개 지면은 APPROVED만, 정렬은 쿼리 분리(ORDER BY는 바인딩 불가). */
public interface ShowcaseProductRepository extends JpaRepository<ShowcaseProduct, Long> {

  String CARD_SELECT =
      """
      SELECT p.id AS "id", p.name AS "name", p.tagline AS "tagline",
             p.category AS "category", p.maker_name AS "makerName",
             (SELECT count(*) FROM showcase_cheer c WHERE c.product_id = p.id) AS "cheerCount",
             (p.image IS NOT NULL) AS "hasImage", p.approved_at AS "approvedAt"
      FROM showcase_product p
      WHERE p.status = 'APPROVED'
        AND (:category IS NULL OR p.category = :category)
      """;

  String CARD_COUNT =
      """
      SELECT count(*) FROM showcase_product p
      WHERE p.status = 'APPROVED'
        AND (:category IS NULL OR p.category = :category)
      """;

  @Query(
      value = CARD_SELECT + " ORDER BY p.approved_at DESC",
      countQuery = CARD_COUNT,
      nativeQuery = true)
  Page<ShowcaseCardRow> listLatest(@Param("category") String category, Pageable pageable);

  @Query(
      value = CARD_SELECT + " ORDER BY \"cheerCount\" DESC, p.approved_at DESC",
      countQuery = CARD_COUNT,
      nativeQuery = true)
  Page<ShowcaseCardRow> listCheered(@Param("category") String category, Pageable pageable);

  /** 주간 모아보기 — 최근 7일 승인작을 응원순으로(기획안 S-5). */
  @Query(
      value =
          """
          SELECT p.id AS "id", p.name AS "name", p.tagline AS "tagline",
                 p.category AS "category", p.maker_name AS "makerName",
                 (SELECT count(*) FROM showcase_cheer c WHERE c.product_id = p.id) AS "cheerCount",
                 (p.image IS NOT NULL) AS "hasImage", p.approved_at AS "approvedAt"
          FROM showcase_product p
          WHERE p.status = 'APPROVED'
            AND p.approved_at >= now() - INTERVAL '7 days'
          ORDER BY "cheerCount" DESC, p.approved_at DESC
          """,
      nativeQuery = true)
  List<ShowcaseCardRow> listWeekly(Pageable pageable);

  @Query(
      value =
          """
          SELECT p.id AS "id", p.name AS "name", p.tagline AS "tagline",
                 p.category AS "category", p.status AS "status",
                 p.reject_reason AS "rejectReason",
                 (SELECT count(*) FROM showcase_cheer c WHERE c.product_id = p.id) AS "cheerCount",
                 p.created_at AS "createdAt"
          FROM showcase_product p
          WHERE p.owner_user_id = :ownerUserId
          ORDER BY p.created_at DESC
          """,
      nativeQuery = true)
  List<ShowcaseMineRow> listMine(@Param("ownerUserId") Long ownerUserId);

  Optional<ShowcaseProduct> findByIdAndOwnerUserId(Long id, Long ownerUserId);
}
