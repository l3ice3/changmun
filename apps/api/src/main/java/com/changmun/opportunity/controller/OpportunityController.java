package com.changmun.opportunity.controller;

import com.changmun.opportunity.dto.OpportunityDetailResponse;
import com.changmun.opportunity.dto.OpportunityListRequest;
import com.changmun.opportunity.dto.OpportunityListResponse;
import com.changmun.opportunity.dto.StatsResponse;
import com.changmun.opportunity.service.OpportunityService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 공고 조회 API — 위임만 한다. 계약: api-spec.md §1·§2. */
@RestController
@RequestMapping("/api/v1/opportunities")
public class OpportunityController {

  private final OpportunityService service;

  public OpportunityController(OpportunityService service) {
    this.service = service;
  }

  @GetMapping
  public OpportunityListResponse list(OpportunityListRequest request) {
    return service.list(request);
  }

  @GetMapping("/stats")
  public StatsResponse stats() {
    return service.stats();
  }

  @GetMapping("/{id}")
  public OpportunityDetailResponse detail(@PathVariable long id) {
    return service.detail(id);
  }
}
