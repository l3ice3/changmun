package com.changmun.showcase.dto;

import com.changmun.showcase.domain.ShowcaseProduct;

/** 소유자 편집용 조회 — 검수 상태와 무관하게 본인 제품의 편집 가능한 필드만 싣는다. */
public record ShowcaseEditViewResponse(
    Long id,
    String name,
    String tagline,
    String description,
    String url,
    String category,
    String makerName,
    boolean hasImage,
    String status) {

  @SuppressWarnings("PMD.LawOfDemeter") // 엔티티 → 응답 1:1 변환 지점(getter 나열이 본질).
  public static ShowcaseEditViewResponse from(ShowcaseProduct product) {
    return new ShowcaseEditViewResponse(
        product.getId(),
        product.getName(),
        product.getTagline(),
        product.getDescription(),
        product.getUrl(),
        product.getCategory().name(),
        product.getMakerName(),
        product.hasImage(),
        product.getStatus().name());
  }
}
