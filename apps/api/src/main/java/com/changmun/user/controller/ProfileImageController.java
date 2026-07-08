package com.changmun.user.controller;

import com.changmun.user.dto.ProfileImageResponse;
import com.changmun.user.service.ProfileImageService;
import java.io.IOException;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/** 마이페이지 프로필 이미지 — 로그인 사용자만(인가는 SecurityConfig). 검증·저장은 서비스에 위임. */
@RestController
@RequestMapping("/api/v1/users/me/profile-image")
public class ProfileImageController {

  private final ProfileImageService service;

  public ProfileImageController(ProfileImageService service) {
    this.service = service;
  }

  @GetMapping
  public ResponseEntity<byte[]> find(@AuthenticationPrincipal OAuth2User principal) {
    ProfileImageResponse image = service.find(userId(principal));
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType(image.contentType()))
        .body(image.image());
  }

  @PutMapping
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void update(
      @AuthenticationPrincipal OAuth2User principal, @RequestParam("image") MultipartFile image)
      throws IOException {
    service.update(userId(principal), image.getBytes(), image.getContentType());
  }

  @DeleteMapping
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void remove(@AuthenticationPrincipal OAuth2User principal) {
    service.remove(userId(principal));
  }

  private static Long userId(OAuth2User principal) {
    Number id = principal.getAttribute("user_id");
    return id.longValue();
  }
}
