package com.changmun.bookmark.repository;

import com.changmun.bookmark.domain.Bookmark;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

  /** 사용자의 찜한 공고 id — 최근 찜 순. */
  @Query("SELECT b.opportunityId FROM Bookmark b WHERE b.userId = :userId ORDER BY b.id DESC")
  List<Long> findOpportunityIdsByUserId(@Param("userId") Long userId);

  /** 멱등 추가 — 이미 찜했으면 무시(원자적, 중복 요청 안전). */
  @Modifying(clearAutomatically = true)
  @Query(
      value =
          """
          INSERT INTO bookmark (user_id, opportunity_id)
          VALUES (:userId, :opportunityId)
          ON CONFLICT (user_id, opportunity_id) DO NOTHING
          """,
      nativeQuery = true)
  void add(@Param("userId") Long userId, @Param("opportunityId") Long opportunityId);

  void deleteByUserIdAndOpportunityId(Long userId, Long opportunityId);
}
