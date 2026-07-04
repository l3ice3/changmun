package com.changmun.user.service;

import java.util.List;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/**
 * GitHub는 사용자가 공개 이메일을 숨기면 `/user` 응답의 email이 null이다. 로그인에 필요한 이메일을 `/user/emails`에서
 * primary·verified 건으로 보완 조회한다(scope `user:email` 필요).
 */
@Component
public class GithubEmailResolver {

  private static final String EMAILS_URI = "https://api.github.com/user/emails";

  private final RestClient restClient = RestClient.create();

  @SuppressWarnings("PMD.LawOfDemeter") // RestClient 플루언트 빌더 체인.
  public String resolvePrimaryEmail(String accessToken) {
    List<GithubEmail> emails =
        restClient
            .get()
            .uri(EMAILS_URI)
            .header("Authorization", "Bearer " + accessToken)
            .header("Accept", "application/vnd.github+json")
            .retrieve()
            .body(new ParameterizedTypeReference<List<GithubEmail>>() {});
    return primaryVerified(emails);
  }

  /** primary이고 verified인 이메일을 고른다 — 없으면 null(호출부가 로그인 거부). */
  static String primaryVerified(List<GithubEmail> emails) {
    if (emails == null) {
      return null;
    }
    return emails.stream()
        .filter(GithubEmail::primary)
        .filter(GithubEmail::verified)
        .map(GithubEmail::email)
        .findFirst()
        .orElse(null);
  }

  record GithubEmail(String email, boolean primary, boolean verified) {}
}
