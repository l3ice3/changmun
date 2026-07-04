package com.changmun.user.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.changmun.user.service.GithubEmailResolver.GithubEmail;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** GitHub /user/emails 응답에서 로그인 이메일을 고르는 규칙 — primary && verified. */
class GithubEmailResolverTest {

  @Test
  @DisplayName("primary이고 verified인 이메일을 고른다")
  void picksPrimaryVerified() {
    List<GithubEmail> emails =
        List.of(
            new GithubEmail("secondary@example.com", false, true),
            new GithubEmail("primary@example.com", true, true));

    assertThat(GithubEmailResolver.primaryVerified(emails)).isEqualTo("primary@example.com");
  }

  @Test
  @DisplayName("primary지만 verified가 아니면 로그인 이메일로 쓰지 않는다")
  void skipsUnverifiedPrimary() {
    List<GithubEmail> emails =
        List.of(
            new GithubEmail("unverified@example.com", true, false),
            new GithubEmail("verified-secondary@example.com", false, true));

    assertThat(GithubEmailResolver.primaryVerified(emails)).isNull();
  }

  @Test
  @DisplayName("빈 목록·null은 null이다(호출부가 로그인 거부)")
  void emptyOrNull() {
    assertThat(GithubEmailResolver.primaryVerified(List.of())).isNull();
    assertThat(GithubEmailResolver.primaryVerified(null)).isNull();
  }
}
