package com.changmun.showcase.domain;

import com.changmun.common.web.NotFoundException;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;

/**
 * 쇼케이스 제품 — db/migrations `showcase_product` 스키마와 1:1 (기획안 §5). 검수 상태 전이(승인/거절)는 관리자 UI 없이 DB 수동이라
 * 엔티티에는 없다 — 등록/수정 시 PENDING으로 돌아가는 행위만 가진다.
 */
@SuppressWarnings("PMD.TooManyFields") // showcase_product 스키마 컬럼 1:1 매핑 엔티티.
@Entity
@Table(name = "showcase_product")
@Getter
public class ShowcaseProduct {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "owner_user_id")
  private Long ownerUserId;

  @Column(name = "name")
  private String name;

  @Column(name = "tagline")
  private String tagline;

  @Column(name = "description")
  private String description;

  @Column(name = "url")
  private String url;

  @Column(name = "image")
  private byte[] image;

  @Column(name = "image_type")
  private String imageType;

  @Column(name = "category")
  @Enumerated(EnumType.STRING)
  private ShowcaseCategory category;

  @Column(name = "maker_name")
  private String makerName;

  @Column(name = "status")
  @Enumerated(EnumType.STRING)
  private ShowcaseStatus status;

  @Column(name = "reject_reason")
  private String rejectReason;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  @Column(name = "approved_at")
  private Instant approvedAt;

  @Column(name = "updated_at")
  private Instant updatedAt;

  protected ShowcaseProduct() {}

  private ShowcaseProduct(ShowcaseContent content, Long ownerUserId) {
    this.ownerUserId = ownerUserId;
    this.status = ShowcaseStatus.PENDING;
    this.updatedAt = Instant.now();
    apply(content);
  }

  public static ShowcaseProduct register(ShowcaseContent content, Long ownerUserId) {
    return new ShowcaseProduct(content, ownerUserId);
  }

  /** 본인 글 수정 — 내용이 바뀌므로 재검수(PENDING)로 되돌린다(기획안 §6). */
  public void edit(ShowcaseContent content) {
    apply(content);
    this.status = ShowcaseStatus.PENDING;
    this.approvedAt = null;
    this.rejectReason = null;
    this.updatedAt = Instant.now();
  }

  public boolean isApproved() {
    return status == ShowcaseStatus.APPROVED;
  }

  /** 소유자 검증 — 남의 글은 존재 자체를 숨긴다(404, 존재 노출 방지). */
  public void ensureOwnedBy(Long userId) {
    if (!ownerUserId.equals(userId)) {
      throw new NotFoundException("등록한 제품을 찾을 수 없습니다: " + id);
    }
  }

  public boolean hasImage() {
    return image != null && imageType != null;
  }

  private void apply(ShowcaseContent content) {
    this.name = content.name();
    this.tagline = content.tagline();
    this.description = content.description();
    this.url = content.url();
    this.category = content.category();
    this.makerName = content.makerName();
    if (content.image() != null) {
      this.image = content.image();
      this.imageType = content.imageType();
    }
  }
}
