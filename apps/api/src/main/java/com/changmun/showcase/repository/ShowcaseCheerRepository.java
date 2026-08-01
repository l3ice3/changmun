package com.changmun.showcase.repository;

import com.changmun.showcase.domain.ShowcaseCheer;
import com.changmun.showcase.domain.ShowcaseCheerId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * 쇼케이스 응원 — 복합 PK(product_id, user_id). 토글은 read-then-write 경쟁(같은 사용자 연타 시 UNIQUE 위반 500)을 피하려고 문장
 * 단위 원자 연산으로 제공한다(Codex #78 P2): 삭제는 반환 행 수로 존재를 판정하고, 삽입은 ON CONFLICT DO NOTHING으로 멱등.
 */
public interface ShowcaseCheerRepository extends JpaRepository<ShowcaseCheer, ShowcaseCheerId> {

  long countByIdProductId(Long productId);

  @Modifying
  @Query(
      value = "DELETE FROM showcase_cheer WHERE product_id = :productId AND user_id = :userId",
      nativeQuery = true)
  int deleteCheer(@Param("productId") Long productId, @Param("userId") Long userId);

  @Modifying
  @Query(
      value =
          """
          INSERT INTO showcase_cheer (product_id, user_id) VALUES (:productId, :userId)
          ON CONFLICT DO NOTHING
          """,
      nativeQuery = true)
  int insertCheer(@Param("productId") Long productId, @Param("userId") Long userId);
}
