package com.changmun.showcase.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.changmun.showcase.dto.ShowcaseForm;
import com.changmun.showcase.service.ShowcaseFormValidator;
import com.changmun.showcase.service.ShowcaseService;
import com.changmun.user.domain.AppUser;
import com.changmun.user.repository.AppUserRepository;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 응원 원자 연산 — 중복 삽입 멱등(UNIQUE 위반 500 방지)·삭제 반환 행 수 판정 (Codex #78 P2). */
@SuppressWarnings("PMD.TooManyFields") // 테스트 픽스처 — 컨테이너·리포지토리·시드 상태 보관.
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Testcontainers
@Import({ShowcaseService.class, ShowcaseFormValidator.class})
class ShowcaseCheerRepositoryTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private ShowcaseCheerRepository cheerRepository;
  @Autowired private ShowcaseService showcaseService;
  @Autowired private AppUserRepository userRepository;
  @Autowired private DataSource dataSource;

  private Long userId;
  private Long productId;

  @BeforeEach
  void setUp() {
    new JdbcTemplate(dataSource).update("TRUNCATE app_user, showcase_product CASCADE");
    userId = userRepository.save(AppUser.of("google", "u-cheer", "cheer@example.com")).getId();
    productId =
        showcaseService.register(
            userId, new ShowcaseForm("제품", "소개", "설명", null, "APP_WEB", "팀", null));
  }

  @Test
  @DisplayName("같은 응원을 두 번 삽입해도 예외 없이 한 건이다(멱등 — 연타 경쟁 대비)")
  void insertIsIdempotent() {
    int first = cheerRepository.insertCheer(productId, userId);
    int second = cheerRepository.insertCheer(productId, userId);

    assertThat(first).isEqualTo(1);
    assertThat(second).isZero();
    assertThat(cheerRepository.countByIdProductId(productId)).isEqualTo(1);
  }

  @Test
  @DisplayName("삭제는 반환 행 수로 존재를 판정한다(있으면 1, 없으면 0)")
  void deleteReturnsAffectedRows() {
    cheerRepository.insertCheer(productId, userId);

    assertThat(cheerRepository.deleteCheer(productId, userId)).isEqualTo(1);
    assertThat(cheerRepository.deleteCheer(productId, userId)).isZero();
    assertThat(cheerRepository.countByIdProductId(productId)).isZero();
  }
}
