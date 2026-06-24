package com.changmun.glossary.repository;

import com.changmun.glossary.domain.GlossaryTerm;
import org.springframework.data.jpa.repository.JpaRepository;

/** 용어 사전 조회 — 전체 일괄 반환(수십 개 규모, 프론트 캐싱). api-spec.md §3. */
public interface GlossaryRepository extends JpaRepository<GlossaryTerm, Long> {}
