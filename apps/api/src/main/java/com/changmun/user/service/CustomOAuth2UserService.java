package com.changmun.user.service;

import java.util.List;
import java.util.Map;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

/**
 * OAuth2 로그인 콜백 처리 — provider 응답에서 사용자를 upsert하고, 세션 principal 속성을 (provider·provider_uid·email)로
 * 평탄화한다. provider마다 다른 nameAttribute 문제를 여기서 통일한다.
 */
@Service
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

  private static final String NAME_ATTRIBUTE = "provider_uid";

  private final AppUserService appUserService;

  public CustomOAuth2UserService(AppUserService appUserService) {
    this.appUserService = appUserService;
  }

  @Override
  @SuppressWarnings(
      "PMD.LawOfDemeter") // getClientRegistration().getRegistrationId()는 Spring OAuth2 API 형태.
  public OAuth2User loadUser(OAuth2UserRequest request) {
    OAuth2User raw = super.loadUser(request);
    String provider = request.getClientRegistration().getRegistrationId();
    SocialUser social = SocialUser.from(provider, raw.getAttributes());
    requireEmail(social);
    appUserService.upsert(social.provider(), social.uid(), social.email());
    Map<String, Object> attributes =
        Map.of(
            "provider", social.provider(), NAME_ATTRIBUTE, social.uid(), "email", social.email());
    return new DefaultOAuth2User(
        List.of(new SimpleGrantedAuthority("ROLE_USER")), attributes, NAME_ATTRIBUTE);
  }

  private static void requireEmail(SocialUser social) {
    if (social.email() == null || social.email().isBlank()) {
      throw new OAuth2AuthenticationException(
          new OAuth2Error("email_required"), "이메일 제공 동의가 필요합니다.");
    }
  }
}
