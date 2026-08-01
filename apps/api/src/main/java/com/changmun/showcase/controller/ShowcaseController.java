package com.changmun.showcase.controller;

import com.changmun.showcase.dto.ShowcaseCardResponse;
import com.changmun.showcase.dto.ShowcaseCheerResponse;
import com.changmun.showcase.dto.ShowcaseCommentRequest;
import com.changmun.showcase.dto.ShowcaseDetailResponse;
import com.changmun.showcase.dto.ShowcaseEditViewResponse;
import com.changmun.showcase.dto.ShowcaseForm;
import com.changmun.showcase.dto.ShowcaseImageResponse;
import com.changmun.showcase.dto.ShowcaseListResponse;
import com.changmun.showcase.dto.ShowcaseMineResponse;
import com.changmun.showcase.dto.ShowcaseRegisteredResponse;
import com.changmun.showcase.service.ShowcaseReactionService;
import com.changmun.showcase.service.ShowcaseService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.Map;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * 쇼케이스 API (api-spec §6) — 조회는 공개(승인작만), 등록/수정/삭제/응원/댓글은 로그인 필요(인가는 SecurityConfig). 컨트롤러는 위임만 한다.
 */
@RestController
@RequestMapping("/api/v1/showcase")
public class ShowcaseController {

  private static final int DEFAULT_PAGE_SIZE = 12;
  private static final int MAX_PAGE_SIZE = 50;

  private final ShowcaseService service;
  private final ShowcaseReactionService reactionService;

  public ShowcaseController(ShowcaseService service, ShowcaseReactionService reactionService) {
    this.service = service;
    this.reactionService = reactionService;
  }

  @GetMapping
  public ShowcaseListResponse list(
      @RequestParam(required = false) String category,
      @RequestParam(required = false) String sort,
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "" + DEFAULT_PAGE_SIZE) int size) {
    return service.list(category, sort, pageable(page, size));
  }

  @GetMapping("/weekly")
  public Map<String, List<ShowcaseCardResponse>> weekly() {
    return Map.of("items", service.weekly());
  }

  @GetMapping("/mine")
  public Map<String, List<ShowcaseMineResponse>> mine(
      @AuthenticationPrincipal OAuth2User principal) {
    return Map.of("items", service.mine(userId(principal)));
  }

  @GetMapping("/mine/{id}")
  public ShowcaseEditViewResponse mineDetail(
      @AuthenticationPrincipal OAuth2User principal, @PathVariable long id) {
    return service.editView(userId(principal), id);
  }

  @GetMapping("/{id}")
  public ShowcaseDetailResponse detail(
      @AuthenticationPrincipal OAuth2User principal, @PathVariable long id) {
    return reactionService.detail(id, userIdOrNull(principal));
  }

  @GetMapping("/{id}/image")
  public ResponseEntity<byte[]> image(@PathVariable long id) {
    ShowcaseImageResponse image = service.image(id);
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(image.contentType()))
        .body(image.image());
  }

  @PostMapping
  @ResponseStatus(HttpStatus.ACCEPTED)
  public ShowcaseRegisteredResponse register(
      @AuthenticationPrincipal OAuth2User principal, @ModelAttribute ShowcaseForm form) {
    return new ShowcaseRegisteredResponse(service.register(userId(principal), form));
  }

  @PutMapping("/{id}")
  @ResponseStatus(HttpStatus.ACCEPTED)
  public ShowcaseRegisteredResponse edit(
      @AuthenticationPrincipal OAuth2User principal,
      @PathVariable long id,
      @ModelAttribute ShowcaseForm form) {
    service.edit(userId(principal), id, form);
    return new ShowcaseRegisteredResponse(id);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(@AuthenticationPrincipal OAuth2User principal, @PathVariable long id) {
    service.remove(userId(principal), id);
  }

  @PutMapping("/{id}/cheer")
  public ShowcaseCheerResponse cheer(
      @AuthenticationPrincipal OAuth2User principal, @PathVariable long id) {
    return reactionService.toggleCheer(id, userId(principal));
  }

  @PostMapping("/{id}/comments")
  @ResponseStatus(HttpStatus.CREATED)
  public Map<String, Long> comment(
      @AuthenticationPrincipal OAuth2User principal,
      @PathVariable long id,
      @Valid @RequestBody ShowcaseCommentRequest request) {
    return Map.of("id", reactionService.addComment(id, userId(principal), request.body()));
  }

  @DeleteMapping("/comments/{commentId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void removeComment(
      @AuthenticationPrincipal OAuth2User principal, @PathVariable long commentId) {
    reactionService.removeComment(commentId, userId(principal));
  }

  private static Pageable pageable(int page, int size) {
    int safePage = Math.max(page, 1) - 1;
    int safeSize = Math.min(Math.max(size, 1), MAX_PAGE_SIZE);
    return PageRequest.of(safePage, safeSize);
  }

  private static Long userId(OAuth2User principal) {
    Number id = principal.getAttribute("user_id");
    return id.longValue();
  }

  private static Long userIdOrNull(OAuth2User principal) {
    if (principal == null) {
      return null;
    }
    return userId(principal);
  }
}
