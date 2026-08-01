package com.changmun.showcase.dto;

import java.util.List;
import org.springframework.data.domain.Page;

/** 쇼케이스 리스트 응답 봉투 — 공고 리스트와 같은 1-base page 환산(api-spec §1과 동일 규약). */
public record ShowcaseListResponse(
    List<ShowcaseCardResponse> items, int page, int size, long totalItems, int totalPages) {

  public static ShowcaseListResponse of(List<ShowcaseCardResponse> items, Page<?> found) {
    return new ShowcaseListResponse(
        items,
        found.getNumber() + 1,
        found.getSize(),
        found.getTotalElements(),
        found.getTotalPages());
  }
}
