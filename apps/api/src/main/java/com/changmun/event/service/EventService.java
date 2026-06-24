package com.changmun.event.service;

import com.changmun.event.dto.EventRequest;
import com.changmun.event.repository.EventLogRepository;
import java.time.Clock;
import java.time.Instant;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 행동 로그 적재 — append-only. occurredAt 생략 시 서버 수신 시각으로 채운다 (api-spec.md §4). */
@Service
public class EventService {

  private final EventLogRepository repository;
  private final Clock clock;

  public EventService(EventLogRepository repository, Clock clock) {
    this.repository = repository;
    this.clock = clock;
  }

  @Transactional
  public void record(EventRequest request) {
    repository.save(request.toEventLog(Instant.now(clock)));
  }
}
