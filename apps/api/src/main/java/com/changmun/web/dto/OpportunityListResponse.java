package com.changmun.web.dto;

import com.changmun.domain.Opportunity;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;

/** 리스트/검색/찜 조회 응답 봉투 — api-spec.md §1. page는 1-base로 환산해 싣는다. */
public record OpportunityListResponse(
    List<OpportunityResponse> items, int page, int size, long totalItems, int totalPages) {

  public static OpportunityListResponse from(Page<Opportunity> found, LocalDate today) {
    List<OpportunityResponse> items = new ArrayList<>();
    for (Opportunity opportunity : found.getContent()) {
      items.add(OpportunityResponse.from(opportunity, today));
    }
    return new OpportunityListResponse(
        items,
        found.getNumber() + 1,
        found.getSize(),
        found.getTotalElements(),
        found.getTotalPages());
  }

  public static OpportunityListResponse ofItems(List<OpportunityResponse> items) {
    return new OpportunityListResponse(items, 1, items.size(), items.size(), 1);
  }
}
