package com.changmun.user.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.changmun.user.domain.AppUser;
import com.changmun.user.repository.AppUserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 로그인 upsert — 신규 생성 / 재로그인 이메일 갱신(중복 없음). 실 PostgreSQL(Testcontainers). */
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Testcontainers
@Import(AppUserService.class)
class AppUserServiceTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private AppUserService service;
  @Autowired private AppUserRepository repository;

  @Test
  @DisplayName("신규 provider+uid는 새 사용자로 생성된다")
  void createsNewUser() {
    AppUser saved = service.upsert("google", "u1", "a@example.com");

    assertThat(saved.getId()).isNotNull();
    assertThat(repository.count()).isEqualTo(1);
  }

  @Test
  @DisplayName("같은 provider+uid 재로그인은 이메일만 갱신하고 중복 생성하지 않는다")
  void updatesEmailForExisting() {
    service.upsert("google", "u1", "old@example.com");
    service.upsert("google", "u1", "new@example.com");

    assertThat(repository.count()).isEqualTo(1);
    assertThat(repository.findByProviderAndProviderUid("google", "u1"))
        .get()
        .extracting(AppUser::getEmail)
        .isEqualTo("new@example.com");
  }
}
