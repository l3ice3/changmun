package com.changmun.bookmark.controller;

import com.changmun.bookmark.dto.BookmarkListResponse;
import com.changmun.bookmark.service.BookmarkService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** 서버측 찜 — 로그인 사용자만(인가는 SecurityConfig). user_id는 로그인 시 principal 속성에 실린다. */
@RestController
@RequestMapping("/api/v1/bookmarks")
public class BookmarkController {

  private final BookmarkService service;

  public BookmarkController(BookmarkService service) {
    this.service = service;
  }

  @GetMapping
  public BookmarkListResponse list(@AuthenticationPrincipal OAuth2User principal) {
    return new BookmarkListResponse(service.opportunityIds(userId(principal)));
  }

  @PostMapping("/{opportunityId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void add(@AuthenticationPrincipal OAuth2User principal, @PathVariable long opportunityId) {
    service.add(userId(principal), opportunityId);
  }

  @DeleteMapping("/{opportunityId}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(
      @AuthenticationPrincipal OAuth2User principal, @PathVariable long opportunityId) {
    service.remove(userId(principal), opportunityId);
  }

  private static Long userId(OAuth2User principal) {
    Number id = principal.getAttribute("user_id");
    return id.longValue();
  }
}
