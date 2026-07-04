package com.changmun.user.controller;

import com.changmun.user.dto.MeResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 인증 상태 조회. 로그인 시작(/oauth2/authorization/{provider})·콜백·로그아웃(/api/v1/auth/logout)은 Spring Security가
 * 처리.
 */
@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

  @GetMapping("/me")
  public MeResponse me(@AuthenticationPrincipal OAuth2User principal) {
    if (principal == null) {
      return MeResponse.anonymous();
    }
    return new MeResponse(
        true, principal.getAttribute("email"), principal.getAttribute("provider"));
  }
}
