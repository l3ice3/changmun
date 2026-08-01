package com.changmun.showcase.repository;

import com.changmun.showcase.domain.ShowcaseComment;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 쇼케이스 댓글 — 삭제 안 된 것만, 작성순. 표시명 재료(이메일 로컬파트)는 조인으로 함께 싣는다. */
public interface ShowcaseCommentRepository extends JpaRepository<ShowcaseComment, Long> {

  @Query(
      value =
          """
          SELECT m.id AS "id", m.user_id AS "userId", m.body AS "body",
                 split_part(u.email, '@', 1) AS "emailLocalPart", m.created_at AS "createdAt"
          FROM showcase_comment m
          JOIN app_user u ON u.id = m.user_id
          WHERE m.product_id = :productId AND m.deleted_at IS NULL
          ORDER BY m.created_at ASC
          """,
      nativeQuery = true)
  List<ShowcaseCommentRow> listVisible(@Param("productId") Long productId);
}
