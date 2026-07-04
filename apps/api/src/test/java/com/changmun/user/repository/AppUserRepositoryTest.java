package com.changmun.user.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.changmun.user.domain.AppUser;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 로그인 사용자 리포지토리 슬라이스 — 실 PostgreSQL(Testcontainers). data-model.md §8. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Testcontainers
class AppUserRepositoryTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private AppUserRepository repository;

  @Test
  @DisplayName("provider+provider_uid로 저장·조회된다")
  void savesAndFindsByProviderIdentity() {
    repository.save(AppUser.of("google", "g-123", "a@example.com"));

    Optional<AppUser> found = repository.findByProviderAndProviderUid("google", "g-123");

    assertThat(found).isPresent();
    assertThat(found.get().getEmail()).isEqualTo("a@example.com");
  }

  @Test
  @DisplayName("같은 (provider, provider_uid) 중복 저장은 유니크 제약으로 거부된다")
  void duplicateProviderIdentityRejected() {
    repository.saveAndFlush(AppUser.of("google", "dup-1", "a@example.com"));

    assertThatThrownBy(
            () -> repository.saveAndFlush(AppUser.of("google", "dup-1", "c@example.com")))
        .isInstanceOf(DataIntegrityViolationException.class);
  }
}
