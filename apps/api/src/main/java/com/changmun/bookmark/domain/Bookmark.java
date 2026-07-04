package com.changmun.bookmark.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;

/**
 * 서버측 찜 — db/migrations `bookmark` 스키마와 1:1 (data-model.md §8). user_id·opportunity_id는 FK(값으로 보관).
 */
@Entity
@Table(name = "bookmark")
@Getter
public class Bookmark {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "user_id")
  private Long userId;

  @Column(name = "opportunity_id")
  private Long opportunityId;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  protected Bookmark() {}

  private Bookmark(Long userId, Long opportunityId) {
    this.userId = userId;
    this.opportunityId = opportunityId;
  }

  public static Bookmark of(Long userId, Long opportunityId) {
    return new Bookmark(userId, opportunityId);
  }
}
