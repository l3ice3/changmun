package com.changmun.event.controller;

import com.changmun.event.dto.AcceptedResponse;
import com.changmun.event.dto.EventRequest;
import com.changmun.event.service.EventService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 행동 로그 API — 위임만. 202 응답, 클라이언트는 fire-and-forget (api-spec.md §4, AC-026). */
@RestController
@RequestMapping("/api/v1/events")
public class EventController {

  private final EventService service;

  public EventController(EventService service) {
    this.service = service;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.ACCEPTED)
  public AcceptedResponse record(@RequestBody EventRequest request) {
    service.record(request);
    return AcceptedResponse.ok();
  }
}
