package com.changmun.event.repository;

import com.changmun.event.domain.EventLog;
import org.springframework.data.jpa.repository.JpaRepository;

/** 행동 로그 적재 — append-only(save만). api-spec.md §4. */
public interface EventLogRepository extends JpaRepository<EventLog, Long> {}
