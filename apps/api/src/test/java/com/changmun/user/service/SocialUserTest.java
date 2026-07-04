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
  @DisplayName("지원하지 않는 provider는 예외다")
  void unsupported() {
    assertThatThrownBy(() -> SocialUser.from("facebook", Map.of()))
        .isInstanceOf(IllegalStateException.class);
  }
}
