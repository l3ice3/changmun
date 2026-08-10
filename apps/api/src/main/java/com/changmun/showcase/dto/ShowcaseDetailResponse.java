package com.changmun.showcase.dto;

import com.changmun.showcase.domain.ShowcaseProduct;
import java.time.Instant;
import java.util.List;

/** 쇼케이스 상세 — 승인작 공개 정보 + 응원 수/내 응원 여부 + 댓글. mine은 소유자 여부(수정·삭제 버튼). */
public record ShowcaseDetailResponse(
    Long id,
    String name,
    String tagline,
    String description,
    String url,
    String category,
    String makerName,
    long cheers,
    boolean cheeredByMe,
    boolean mine,
    boolean hasImage,
    Instant approvedAt,
    List<ShowcaseCommentResponse> comments) {

  @SuppressWarnings("PMD.LawOfDemeter") // 엔티티 → 응답 1:1 변환 지점(getter 나열이 본질).
  public static ShowcaseDetailResponse from(
      ShowcaseProduct product,
      ShowcaseReactions reactions,
      List<ShowcaseCommentResponse> comments) {
    return new ShowcaseDetailResponse(
        product.getId(),
        product.getName(),
        product.getTagline(),
        product.getDescription(),
        product.getUrl(),
        product.getCategory().name(),
        product.getMakerName(),
        reactions.cheers(),
        reactions.cheeredByMe(),
        reactions.mine(),
        product.hasImage(),
        product.getApprovedAt(),
        comments);
  }
}
