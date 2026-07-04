package com.changmun.common.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;

/**
 * 액세스 토큰을 저장하지 않는 AuthorizedClient 저장소 — 로그인 시 사용자 정보만 추출하고 이후 provider API를 호출하지 않으므로 토큰을 보관하지 않는다
 * (data-model §8 · 절대규칙 6: PII·토큰 최소화). save/load/remove 모두 no-op.
 */
public class NoOpOAuth2AuthorizedClientRepository implements OAuth2AuthorizedClientRepository {

  @Override
  public <T extends OAuth2AuthorizedClient> T loadAuthorizedClient(
      String clientRegistrationId, Authentication principal, HttpServletRequest request) {
    return null;
  }

  @Override
  public void saveAuthorizedClient(
      OAuth2AuthorizedClient authorizedClient,
      Authentication principal,
      HttpServletRequest request,
      HttpServletResponse response) {
    // no-op: 토큰을 세션에 저장하지 않는다.
  }

  @Override
  public void removeAuthorizedClient(
      String clientRegistrationId,
      Authentication principal,
      HttpServletRequest request,
      HttpServletResponse response) {
    // no-op: 저장하지 않으므로 삭제할 것도 없다.
  }
}
