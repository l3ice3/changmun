package com.changmun.opportunity.service;

import com.changmun.common.web.NotFoundException;
import com.changmun.glossary.domain.GlossaryTerm;
import com.changmun.glossary.service.GlossaryService;
import com.changmun.opportunity.domain.Opportunity;
import com.changmun.opportunity.domain.SortOrder;
import com.changmun.opportunity.dto.OpportunityDetailResponse;
import com.changmun.opportunity.dto.OpportunityListRequest;
import com.changmun.opportunity.dto.OpportunityListResponse;
import com.changmun.opportunity.dto.OpportunityResponse;
import com.changmun.opportunity.dto.StatsResponse;
import com.changmun.opportunity.repository.OpportunityRepository;
import com.changmun.opportunity.repository.OpportunitySearchCriteria;
import com.changmun.opportunity.repository.OpportunitySearchCriteria.Filters;
import com.changmun.opportunity.repository.StatsView;
import java.time.Clock;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 리스트/검색·상세 유스케이스 조립. 기준일(today)을 주입한 Clock으로 정하고, 산식은 응답 DTO/도메인에 위임한다. */
@Service
public class OpportunityService {

  private final OpportunityRepository repository;
  private final GlossaryService glossaryService;
  private final Clock clock;

  public OpportunityService(
      OpportunityRepository repository, GlossaryService glossaryService, Clock clock) {
    this.repository = repository;
    this.glossaryService = glossaryService;
    this.clock = clock;
  }

  @Transactional(readOnly = true)
  public StatsResponse stats() {
    StatsView view = repository.stats();
    return new StatsResponse(view.getOpen(), view.getNewToday(), view.getClosingSoon());
  }

  @Transactional(readOnly = true)
  public OpportunityListResponse list(OpportunityListRequest request) {
    LocalDate today = LocalDate.now(clock);
    if (request.isBookmarkQuery()) {
      return bookmarks(request.bookmarkIds(), today);
    }
    Page<Opportunity> found = fetch(request);
    return OpportunityListResponse.from(found, today);
  }

  private OpportunityListResponse bookmarks(Long[] ids, LocalDate today) {
    List<Opportunity> found = repository.findByIdsInOrder(ids);
    List<OpportunityResponse> items = new ArrayList<>();
    for (Opportunity opportunity : found) {
      items.add(OpportunityResponse.from(opportunity, today));
    }
    return OpportunityListResponse.ofItems(items);
  }

  @Transactional(readOnly = true)
  public OpportunityDetailResponse detail(long id) {
    Opportunity opportunity = repository.findById(id).orElseThrow(() -> notFound(id));
    LocalDate today = LocalDate.now(clock);
    List<GlossaryTerm> matched = glossaryService.matchIn(combinedText(opportunity));
    List<Opportunity> siblings = siblingsOf(opportunity);
    return OpportunityDetailResponse.from(opportunity, today, matched, siblings);
  }

  private List<Opportunity> siblingsOf(Opportunity opportunity) {
    Long groupId = opportunity.getDedupGroupId();
    if (groupId == null) {
      return List.of();
    }
    return repository.findGroupSiblings(groupId, opportunity.getId());
  }

  private static String combinedText(Opportunity opportunity) {
    return orEmpty(opportunity.getSummary()) + " " + orEmpty(opportunity.getEligibilityDetail());
  }

  private static String orEmpty(String value) {
    if (value == null) {
      return "";
    }
    return value;
  }

  private static NotFoundException notFound(long id) {
    return new NotFoundException("공고를 찾을 수 없습니다: " + id);
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
        new Filters(
            request.region(),
            request.category(),
            request.source(),
            request.searchTerm(),
            request.onlyOpen());
    return OpportunitySearchCriteria.of(request.persona(), filters);
  }
}
