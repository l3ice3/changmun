package com.changmun.showcase.domain;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;

/** 쇼케이스 응원 — 1인 1제품 1응원(복합 PK). 무결제 수요 신호(추후 펀딩 검증 데이터, 기획안 §7). */
@Entity
@Table(name = "showcase_cheer")
@Getter
public class ShowcaseCheer {

  @EmbeddedId private ShowcaseCheerId id;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  protected ShowcaseCheer() {}

  private ShowcaseCheer(ShowcaseCheerId id) {
    this.id = id;
  }

  public static ShowcaseCheer of(Long productId, Long userId) {
    return new ShowcaseCheer(new ShowcaseCheerId(productId, userId));
  }
}
