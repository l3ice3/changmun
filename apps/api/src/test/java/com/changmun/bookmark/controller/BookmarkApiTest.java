package com.changmun.bookmark.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.changmun.opportunity.support.TestOpportunity;
import com.changmun.user.domain.AppUser;
import com.changmun.user.repository.AppUserRepository;
import java.time.LocalDate;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 서버측 찜 API — 비로그인 401, 로그인 시 추가·조회. 인증/인가 검증. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class BookmarkApiTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private MockMvc mockMvc;
  @Autowired private AppUserRepository userRepository;
  @Autowired private DataSource dataSource;

  private Long userId;
  private Long opportunityId;

  @BeforeEach
  void setUp() {
    JdbcTemplate jdbc = new JdbcTemplate(dataSource);
    jdbc.update("TRUNCATE app_user, opportunity CASCADE");
    userId = userRepository.save(AppUser.of("google", "u-api", "a@example.com")).getId();
    opportunityId = new TestOpportunity().deadline(LocalDate.now().plusDays(5)).insert(jdbc);
  }

  private RequestPostProcessor loginAsUser() {
    return oauth2Login()
        .attributes(
            attrs -> {
              attrs.put("provider", "google");
              attrs.put("provider_uid", "u-api");
              attrs.put("email", "a@example.com");
              attrs.put("user_id", userId);
            });
  }

  @Test
  @DisplayName("비로그인 요청은 401이다")
  void unauthenticatedIsUnauthorized() throws Exception {
    mockMvc.perform(get("/api/v1/bookmarks")).andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("로그인 후 찜 추가는 204이고 목록에 나타난다")
  void authenticatedAddThenListContainsIt() throws Exception {
    mockMvc
        .perform(post("/api/v1/bookmarks/{id}", opportunityId).with(loginAsUser()))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/v1/bookmarks").with(loginAsUser()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.opportunityIds[0]").value(opportunityId));
  }

  @Test
  @DisplayName("없는 공고 찜 추가는 404 NOT_FOUND다(FK 위반 500 아님)")
  void addingNonexistentOpportunityIsNotFound() throws Exception {
    mockMvc
        .perform(post("/api/v1/bookmarks/{id}", 999_999).with(loginAsUser()))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }
}
