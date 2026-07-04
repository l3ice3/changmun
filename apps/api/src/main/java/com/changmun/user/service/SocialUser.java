package com.changmun.user.service;

import java.util.Map;

/**
 * OAuth2 provider 응답에서 (provider, uid, email)만 추출하는 값 객체. provider마다 속성 구조가 달라(kakao·naver는 중첩) 그
 * 차이를 여기서 흡수한다.
 */
public record SocialUser(String provider, String uid, String email) {

  public static SocialUser from(String provider, Map<String, Object> attributes) {
    if ("google".equals(provider)) {
      return new SocialUser(
          provider, string(attributes.get("sub")), string(attributes.get("email")));
    }
    if ("github".equals(provider)) {
      return new SocialUser(
          provider, string(attributes.get("id")), string(attributes.get("email")));
    }
    if ("kakao".equals(provider)) {
      Map<String, Object> account = nested(attributes.get("kakao_account"));
      return new SocialUser(provider, string(attributes.get("id")), string(account.get("email")));
    }
    if ("naver".equals(provider)) {
      Map<String, Object> response = nested(attributes.get("response"));
      return new SocialUser(provider, string(response.get("id")), string(response.get("email")));
    }
    throw new IllegalStateException("지원하지 않는 OAuth provider: " + provider);
  }

  private static String string(Object value) {
    if (value == null) {
      return null;
    }
    return String.valueOf(value);
  }

  @SuppressWarnings("unchecked")
  private static Map<String, Object> nested(Object value) {
    if (value instanceof Map<?, ?> map) {
      return (Map<String, Object>) map;
    }
    return Map.of();
  }
}
