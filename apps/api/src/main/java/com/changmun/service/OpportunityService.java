package com.changmun.service;

import com.changmun.domain.Opportunity;
import com.changmun.domain.SortOrder;
import com.changmun.repository.OpportunityRepository;
import com.changmun.repository.OpportunitySearchCriteria;
import com.changmun.repository.OpportunitySearchCriteria.Filters;
import com.changmun.web.dto.OpportunityListRequest;
import com.changmun.web.dto.OpportunityListResponse;
import java.time.Clock;
import java.time.LocalDate;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 리스트/검색 유스케이스 조립. 기준일(today)을 주입한 Clock으로 정하고, 산식은 응답 DTO/도메인에 위임한다. */
@Service
public class OpportunityService {

  private final OpportunityRepository repository;
  private final Clock clock;

  public OpportunityService(OpportunityRepository repository, Clock clock) {
    this.repository = repository;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public OpportunityListResponse list(OpportunityListRequest request) {
    LocalDate today = LocalDate.now(clock);
    Page<Opportunity> found = fetch(request);
    return OpportunityListResponse.from(found, today);
  }

  private Page<Opportunity> fetch(OpportunityListRequest request) {
    OpportunitySearchCriteria criteria = criteriaOf(request);
    Pageable pageable = PageRequest.of(request.pageIndex(), request.pageSize());
    if (request.sortOrder() == SortOrder.LATEST) {
      return repository.searchByLatest(criteria, pageable);
    }
    return repository.searchByDeadline(criteria, pageable);
  }

  private static OpportunitySearchCriteria criteriaOf(OpportunityListRequest request) {
    Filters filters =
        new Filters(request.region(), request.category(), request.searchTerm(), request.onlyOpen());
    return OpportunitySearchCriteria.of(request.persona(), filters);
  }
}
