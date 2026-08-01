package com.changmun.showcase.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serializable;
import java.util.Objects;

/** showcase_cheer 복합 PK(product_id, user_id). */
@Embeddable
public class ShowcaseCheerId implements Serializable {

  @Column(name = "product_id")
  private Long productId;

  @Column(name = "user_id")
  private Long userId;

  protected ShowcaseCheerId() {}

  public ShowcaseCheerId(Long productId, Long userId) {
    this.productId = productId;
    this.userId = userId;
  }

  @Override
  public boolean equals(Object other) {
    if (this == other) {
      return true;
    }
    if (!(other instanceof ShowcaseCheerId that)) {
      return false;
    }
    return Objects.equals(productId, that.productId) && Objects.equals(userId, that.userId);
  }

  @Override
  public int hashCode() {
    return Objects.hash(productId, userId);
  }
}
