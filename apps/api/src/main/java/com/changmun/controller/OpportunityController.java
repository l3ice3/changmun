package com.changmun.controller;

import com.changmun.service.OpportunityService;
import com.changmun.web.dto.OpportunityListRequest;
import com.changmun.web.dto.OpportunityListResponse;
import org.springframework.web.bind.annotation.GetMapping;
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
}
