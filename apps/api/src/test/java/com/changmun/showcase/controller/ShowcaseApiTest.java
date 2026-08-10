package com.changmun.showcase.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.changmun.user.domain.AppUser;
import com.changmun.user.repository.AppUserRepository;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 쇼케이스 API E2E — 인증/인가·선검수 흐름·응원 토글·댓글(마스킹 표시명)·400 검증. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ShowcaseApiTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private MockMvc mockMvc;
  @Autowired private AppUserRepository userRepository;
  @Autowired private DataSource dataSource;

  private JdbcTemplate jdbc;
  private Long userId;

  @BeforeEach
  void setUp() {
    jdbc = new JdbcTemplate(dataSource);
    jdbc.update("TRUNCATE app_user, showcase_product CASCADE");
    userId = userRepository.save(AppUser.of("google", "u-sc-api", "archer@example.com")).getId();
  }

  private RequestPostProcessor loginAsUser() {
    return oauth2Login()
        .attributes(
            attrs -> {
              attrs.put("provider", "google");
              attrs.put("provider_uid", "u-sc-api");
              attrs.put("email", "archer@example.com");
              attrs.put("user_id", userId);
            });
  }

  @SuppressWarnings("PMD.LawOfDemeter") // MockMvc 결과 접근 체인은 테스트 API 형태.
  private Long registerApproved() throws Exception {
    MvcResult result =
        mockMvc
            .perform(
                multipart("/api/v1/showcase")
                    .param("name", "창문 클라이언트")
                    .param("tagline", "지원금을 더 빨리")
                    .param("description", "설명입니다")
                    .param("category", "APP_WEB")
                    .param("makerName", "창문팀")
                    .with(loginAsUser()))
            .andExpect(status().isAccepted())
            .andReturn();
    String body = result.getResponse().getContentAsString();
    Long productId = Long.valueOf(body.replaceAll("[^0-9]", ""));
    jdbc.update(
        "UPDATE showcase_product SET status='APPROVED', approved_at=now() WHERE id=?", productId);
    return productId;
  }

  @Test
  @DisplayName("비로그인 등록 요청은 401이다")
  void unauthenticatedRegisterIsUnauthorized() throws Exception {
    mockMvc
        .perform(multipart("/api/v1/showcase").param("name", "x"))
        .andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("공개 리스트는 비로그인도 200이고, 승인 전 제품은 비어 있다")
  void publicListIsOpenAndHidesPending() throws Exception {
    mockMvc
        .perform(
            multipart("/api/v1/showcase")
                .param("name", "검수 중 제품")
                .param("tagline", "소개")
                .param("description", "설명")
                .param("category", "APP_WEB")
                .param("makerName", "창문팀")
                .with(loginAsUser()))
        .andExpect(status().isAccepted());

    mockMvc
        .perform(get("/api/v1/showcase"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items").isEmpty());
  }

  @Test
  @DisplayName("승인된 제품은 비로그인 상세에서 200이고 응원 0으로 시작한다")
  void approvedDetailIsPublic() throws Exception {
    Long productId = registerApproved();

    mockMvc
        .perform(get("/api/v1/showcase/{id}", productId))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.name").value("창문 클라이언트"))
        .andExpect(jsonPath("$.cheers").value(0))
        .andExpect(jsonPath("$.cheeredByMe").value(false));
  }

  @Test
  @DisplayName("응원 토글 — 처음은 +1, 다시 누르면 취소된다")
  void cheerToggles() throws Exception {
    Long productId = registerApproved();

    mockMvc
        .perform(put("/api/v1/showcase/{id}/cheer", productId).with(loginAsUser()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.cheered").value(true))
        .andExpect(jsonPath("$.cheers").value(1));

    mockMvc
        .perform(put("/api/v1/showcase/{id}/cheer", productId).with(loginAsUser()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.cheered").value(false))
        .andExpect(jsonPath("$.cheers").value(0));
  }

  @Test
  @DisplayName("댓글 작성 후 상세에 마스킹 표시명(ar***)으로 나온다")
  void commentShowsMaskedDisplayName() throws Exception {
    Long productId = registerApproved();

    mockMvc
        .perform(
            post("/api/v1/showcase/{id}/comments", productId)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"body\":\"응원합니다!\"}")
                .with(loginAsUser()))
        .andExpect(status().isCreated());

    mockMvc
        .perform(get("/api/v1/showcase/{id}", productId).with(loginAsUser()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.comments[0].displayName").value("ar***"))
        .andExpect(jsonPath("$.comments[0].mine").value(true));
  }

  @Test
  @DisplayName("잘못된 category는 400 INVALID_PARAM이다")
  void invalidCategoryIsBadRequest() throws Exception {
    mockMvc
        .perform(
            multipart("/api/v1/showcase")
                .param("name", "제품")
                .param("tagline", "소개")
                .param("description", "설명")
                .param("category", "WRONG")
                .param("makerName", "팀")
                .with(loginAsUser()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PARAM"));
  }

  @Test
  @DisplayName("본인 등록물 목록(mine)은 검수 상태를 포함하고, 비로그인은 401이다")
  void mineRequiresLoginAndShowsStatus() throws Exception {
    registerApproved();

    mockMvc.perform(get("/api/v1/showcase/mine")).andExpect(status().isUnauthorized());

    mockMvc
        .perform(get("/api/v1/showcase/mine").with(loginAsUser()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].status").value("APPROVED"));
  }

  @Test
  @DisplayName("본인 제품 삭제는 204이고 상세는 404가 된다")
  void ownerCanDelete() throws Exception {
    Long productId = registerApproved();

    mockMvc
        .perform(delete("/api/v1/showcase/{id}", productId).with(loginAsUser()))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get("/api/v1/showcase/{id}", productId))
        .andExpect(status().isNotFound())
        .andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }
}
