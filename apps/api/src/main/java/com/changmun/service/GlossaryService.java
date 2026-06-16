package com.changmun.service;

import com.changmun.domain.Glossary;
import com.changmun.domain.GlossaryTerm;
import com.changmun.repository.GlossaryRepository;
import com.changmun.web.dto.GlossaryResponse;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 용어 사전 조회·매칭 (FR-004, api-spec.md §3). 규모가 작아 매번 전체 로드 — 추후 캐싱 여지. */
@Service
public class GlossaryService {

  private final GlossaryRepository repository;

  public GlossaryService(GlossaryRepository repository) {
    this.repository = repository;
  }

  @Transactional(readOnly = true)
  public GlossaryResponse all() {
    return GlossaryResponse.from(repository.findAll());
  }

  @Transactional(readOnly = true)
  public List<GlossaryTerm> matchIn(String text) {
    return new Glossary(repository.findAll()).matchIn(text);
  }
}
