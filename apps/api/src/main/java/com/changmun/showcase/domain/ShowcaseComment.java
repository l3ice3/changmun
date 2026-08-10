package com.changmun.showcase.domain;

import com.changmun.common.web.NotFoundException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;

/** 쇼케이스 댓글 — `showcase_comment` 스키마와 1:1. 소프트 삭제(deleted_at)로 흔적을 유지한다. */
@SuppressWarnings("PMD.TooManyFields") // showcase_comment 스키마 컬럼 1:1 매핑 엔티티.
@Entity
@Table(name = "showcase_comment")
@Getter
public class ShowcaseComment {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "product_id")
  private Long productId;

  @Column(name = "user_id")
  private Long userId;

  @Column(name = "body")
  private String body;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "deleted_at")
  private Instant deletedAt;

  protected ShowcaseComment() {}

  private ShowcaseComment(Long productId, Long userId, String body) {
    this.productId = productId;
    this.userId = userId;
    this.body = body;
  }

  public static ShowcaseComment write(Long productId, Long userId, String body) {
    return new ShowcaseComment(productId, userId, body);
  }

  /** 본인 댓글만 삭제 — 남의 댓글은 존재를 숨긴다(404). */
  public void softDeleteBy(Long requesterUserId) {
    if (!userId.equals(requesterUserId)) {
      throw new NotFoundException("댓글을 찾을 수 없습니다: " + id);
    }
    this.deletedAt = Instant.now();
  }
}
