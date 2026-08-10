package com.changmun.showcase.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.changmun.common.web.NotFoundException;
import com.changmun.showcase.dto.ShowcaseForm;
import com.changmun.showcase.dto.ShowcaseListResponse;
import com.changmun.showcase.dto.ShowcaseMineResponse;
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
import org.springframework.data.domain.PageRequest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 쇼케이스 서비스 — 선검수 후게시(PENDING→APPROVED)·리스트/주간·본인 관리. 실 PostgreSQL. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Testcontainers
@Import({ShowcaseService.class, ShowcaseFormValidator.class})
class ShowcaseServiceTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private ShowcaseService service;
  @Autowired private AppUserRepository userRepository;
  @Autowired private DataSource dataSource;

  private JdbcTemplate jdbc;
  private Long userId;

  @BeforeEach
  void setUp() {
    jdbc = new JdbcTemplate(dataSource);
    jdbc.update("TRUNCATE app_user, showcase_product CASCADE");
    userId = userRepository.save(AppUser.of("google", "u-showcase", "maker@example.com")).getId();
  }

  private ShowcaseForm form(String name) {
    return new ShowcaseForm(name, "한 줄 소개", "설명입니다", "https://example.com", "APP_WEB", "창문팀", null);
  }

  private void approve(Long productId) {
    jdbc.update(
        "UPDATE showcase_product SET status='APPROVED', approved_at=now() WHERE id=?", productId);
  }

  @Test
  @DisplayName("등록 직후에는 검수 중(PENDING)이라 공개 리스트에 나오지 않는다")
  void registeredProductIsHiddenUntilApproved() {
    service.register(userId, form("숨은 제품"));

    ShowcaseListResponse list = service.list(null, null, PageRequest.of(0, 12));

    assertThat(list.items()).isEmpty();
  }

  @Test
  @DisplayName("승인(APPROVED)되면 공개 리스트에 나온다")
  void approvedProductAppearsInList() {
    Long productId = service.register(userId, form("공개 제품"));
    approve(productId);

    ShowcaseListResponse list = service.list(null, null, PageRequest.of(0, 12));

    assertThat(list.items()).hasSize(1);
    assertThat(list.items().get(0).name()).isEqualTo("공개 제품");
  }

  @Test
  @DisplayName("본인 수정은 재검수(PENDING)로 되돌린다")
  void editingResetsToPending() {
    Long productId = service.register(userId, form("수정 전"));
    approve(productId);

    service.edit(userId, productId, form("수정 후"));

    ShowcaseListResponse list = service.list(null, null, PageRequest.of(0, 12));
    assertThat(list.items()).isEmpty();
    ShowcaseMineResponse mine = service.mine(userId).get(0);
    assertThat(mine.status()).isEqualTo("PENDING");
    assertThat(mine.name()).isEqualTo("수정 후");
  }

  @Test
  @DisplayName("남의 제품 수정 시도는 404다(존재 노출 방지)")
  void editingOthersProductIsNotFound() {
    Long otherId = userRepository.save(AppUser.of("google", "u-other", "o@example.com")).getId();
    Long productId = service.register(otherId, form("남의 제품"));

    assertThatThrownBy(() -> service.edit(userId, productId, form("탈취")))
        .isInstanceOf(NotFoundException.class);
  }

  @Test
  @DisplayName("카테고리 필터가 적용된다")
  void listFiltersByCategory() {
    Long appWeb = service.register(userId, form("앱 제품"));
    approve(appWeb);
    Long commerce =
        service.register(
            userId, new ShowcaseForm("커머스 제품", "소개", "설명", null, "COMMERCE", "창문팀", null));
    approve(commerce);

    ShowcaseListResponse list = service.list("COMMERCE", null, PageRequest.of(0, 12));

    assertThat(list.items()).hasSize(1);
    assertThat(list.items().get(0).category()).isEqualTo("COMMERCE");
  }

  @Test
  @DisplayName("검수 중 제품 상세 조회는 404다")
  void pendingDetailIsNotFound() {
    Long productId = service.register(userId, form("검수 중"));

    assertThatThrownBy(() -> service.findApproved(productId)).isInstanceOf(NotFoundException.class);
  }
}
