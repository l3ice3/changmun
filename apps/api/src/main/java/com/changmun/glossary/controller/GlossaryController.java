package com.changmun.glossary.controller;

import com.changmun.glossary.dto.GlossaryResponse;
import com.changmun.glossary.service.GlossaryService;
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
