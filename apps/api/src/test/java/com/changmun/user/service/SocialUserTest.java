package com.changmun.user.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** provider별 속성 구조(평문·중첩) 추출 단위 테스트. */
class SocialUserTest {

  @Test
  @DisplayName("google — sub·email 평문 추출")
  void google() {
    SocialUser user = SocialUser.from("google", Map.of("sub", "g-1", "email", "a@example.com"));

    assertThat(user.uid()).isEqualTo("g-1");
    assertThat(user.email()).isEqualTo("a@example.com");
  }

  @Test
  @DisplayName("kakao — id + 중첩 kakao_account.email 추출")
  void kakao() {
    SocialUser user =
        SocialUser.from(
            "kakao", Map.of("id", 12345L, "kakao_account", Map.of("email", "k@example.com")));

    assertThat(user.uid()).isEqualTo("12345");
    assertThat(user.email()).isEqualTo("k@example.com");
  }

  @Test
  @DisplayName("naver — 중첩 response.{id,email} 추출")
  void naver() {
    SocialUser user =
        SocialUser.from("naver", Map.of("response", Map.of("id", "n-1", "email", "n@example.com")));

    assertThat(user.uid()).isEqualTo("n-1");
    assertThat(user.email()).isEqualTo("n@example.com");
  }

  @Test
  @DisplayName("github — id·email 평문 추출")
  void github() {
    SocialUser user = SocialUser.from("github", Map.of("id", 999, "email", "gh@example.com"));

    assertThat(user.uid()).isEqualTo("999");
    assertThat(user.email()).isEqualTo("gh@example.com");
  }

  @Test
  @DisplayName("github — 공개 이메일 숨김이면 email이 null이다(이후 보완 조회 대상)")
  void githubHiddenEmail() {
    SocialUser user = SocialUser.from("github", Map.of("id", 999));

    assertThat(user.uid()).isEqualTo("999");
    assertThat(user.email()).isNull();
  }

  @Test
  @DisplayName("withEmail은 uid·provider는 두고 이메일만 교체한 사본을 만든다")
  void withEmail() {
    SocialUser resolved =
        SocialUser.from("github", Map.of("id", "1", "email", "old@example.com"))
            .withEmail("new@example.com");

    assertThat(resolved.uid()).isEqualTo("1");
    assertThat(resolved.provider()).isEqualTo("github");
    assertThat(resolved.email()).isEqualTo("new@example.com");
  }

  @Test
  @DisplayName("지원하지 않는 provider는 예외다")
  void unsupported() {
    assertThatThrownBy(() -> SocialUser.from("facebook", Map.of()))
        .isInstanceOf(IllegalStateException.class);
  }
}
