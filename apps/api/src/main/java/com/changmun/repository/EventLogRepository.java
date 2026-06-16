package com.changmun.repository;

import com.changmun.domain.EventLog;
import org.springframework.data.jpa.repository.JpaRepository;

/** 행동 로그 적재 — append-only(save만). api-spec.md §4. */
public interface EventLogRepository extends JpaRepository<EventLog, Long> {}
