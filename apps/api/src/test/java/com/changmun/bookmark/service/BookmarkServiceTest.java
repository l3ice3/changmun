package com.changmun.bookmark.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.changmun.opportunity.support.TestOpportunity;
import com.changmun.user.domain.AppUser;
import com.changmun.user.repository.AppUserRepository;
import java.time.LocalDate;
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

/** 서버측 찜 서비스 — 추가(멱등)·삭제·조회. 실 PostgreSQL(Testcontainers) + 실 FK(app_user·opportunity). */
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Testcontainers
@Import(BookmarkService.class)
class BookmarkServiceTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private BookmarkService service;
  @Autowired private AppUserRepository userRepository;
  @Autowired private DataSource dataSource;

  private Long userId;
  private Long opportunityId;

  @BeforeEach
  void setUp() {
    userId = userRepository.save(AppUser.of("google", "u-svc", "a@example.com")).getId();
    opportunityId =
        new TestOpportunity()
            .deadline(LocalDate.now().plusDays(5))
            .insert(new JdbcTemplate(dataSource));
  }

  @Test
  @DisplayName("찜 추가 후 조회하면 해당 공고 id가 나온다")
  void addThenList() {
    service.add(userId, opportunityId);

    assertThat(service.opportunityIds(userId)).containsExactly(opportunityId);
  }

  @Test
  @DisplayName("같은 공고 찜을 두 번 추가해도 한 건이다(멱등)")
  void addIsIdempotent() {
    service.add(userId, opportunityId);
    service.add(userId, opportunityId);

    assertThat(service.opportunityIds(userId)).containsExactly(opportunityId);
  }

  @Test
  @DisplayName("찜 삭제 후 조회하면 비어 있다")
  void removeDeletesBookmark() {
    service.add(userId, opportunityId);
    service.remove(userId, opportunityId);

    assertThat(service.opportunityIds(userId)).isEmpty();
  }
}
