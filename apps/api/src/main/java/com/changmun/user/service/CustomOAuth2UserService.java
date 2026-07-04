package com.changmun.user.service;

import com.changmun.user.domain.AppUser;
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
  private static final String GITHUB = "github";

  private final AppUserService appUserService;
  private final GithubEmailResolver githubEmailResolver;

  public CustomOAuth2UserService(
      AppUserService appUserService, GithubEmailResolver githubEmailResolver) {
    this.appUserService = appUserService;
    this.githubEmailResolver = githubEmailResolver;
  }

  @Override
  @SuppressWarnings(
      "PMD.LawOfDemeter") // getClientRegistration()·getAccessToken() 체인은 Spring OAuth2 API 형태.
  public OAuth2User loadUser(OAuth2UserRequest request) {
    OAuth2User raw = super.loadUser(request);
    String provider = request.getClientRegistration().getRegistrationId();
    SocialUser social =
        resolveEmailIfMissing(provider, SocialUser.from(provider, raw.getAttributes()), request);
    requireEmail(social);
    AppUser user = appUserService.upsert(social.provider(), social.uid(), social.email());
    Map<String, Object> attributes =
        Map.of(
            "provider",
            social.provider(),
            NAME_ATTRIBUTE,
            social.uid(),
            "email",
            social.email(),
            "user_id",
            user.getId());
    return new DefaultOAuth2User(
        List.of(new SimpleGrantedAuthority("ROLE_USER")), attributes, NAME_ATTRIBUTE);
  }

  /** GitHub는 공개 이메일을 숨기면 email이 null이라 /user/emails에서 primary·verified로 보완 조회한다. */
  @SuppressWarnings("PMD.LawOfDemeter")
  private SocialUser resolveEmailIfMissing(
      String provider, SocialUser social, OAuth2UserRequest request) {
    if (!GITHUB.equals(provider)) {
      return social;
    }
    if (social.email() != null && !social.email().isBlank()) {
      return social;
    }
    String token = request.getAccessToken().getTokenValue();
    return social.withEmail(githubEmailResolver.resolvePrimaryEmail(token));
  }

  private static void requireEmail(SocialUser social) {
    if (social.email() == null || social.email().isBlank()) {
      throw new OAuth2AuthenticationException(
          new OAuth2Error("email_required"), "이메일 제공 동의가 필요합니다.");
    }
  }
}
