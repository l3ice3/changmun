package com.changmun.controller;

import com.changmun.service.GlossaryService;
import com.changmun.web.dto.GlossaryResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 용어 사전 API — 위임만. 계약: api-spec.md §3. */
@RestController
@RequestMapping("/api/v1/glossary")
public class GlossaryController {

  private final GlossaryService service;

  public GlossaryController(GlossaryService service) {
    this.service = service;
  }

  @GetMapping
  public GlossaryResponse list() {
    return service.all();
  }
}
