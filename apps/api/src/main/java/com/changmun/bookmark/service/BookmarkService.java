package com.changmun.bookmark.service;

import com.changmun.bookmark.repository.BookmarkRepository;
import com.changmun.common.web.NotFoundException;
import com.changmun.opportunity.repository.OpportunityRepository;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 서버측 찜 유스케이스 — 로그인 사용자(userId) 기준 추가/삭제/조회. */
@Service
public class BookmarkService {

  private final BookmarkRepository repository;
  private final OpportunityRepository opportunityRepository;

  public BookmarkService(
      BookmarkRepository repository, OpportunityRepository opportunityRepository) {
    this.repository = repository;
    this.opportunityRepository = opportunityRepository;
  }

  @Transactional
  public void add(Long userId, Long opportunityId) {
    if (!opportunityRepository.existsById(opportunityId)) {
      throw new NotFoundException("공고를 찾을 수 없습니다: " + opportunityId);
    }
    repository.add(userId, opportunityId);
  }

  @Transactional
  public void remove(Long userId, Long opportunityId) {
    repository.deleteByUserIdAndOpportunityId(userId, opportunityId);
  }

  @Transactional(readOnly = true)
  public List<Long> opportunityIds(Long userId) {
    return repository.findOpportunityIdsByUserId(userId);
  }
}
