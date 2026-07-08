package com.changmun.user.controller;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.oauth2Login;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
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
import org.springframework.http.HttpMethod;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 프로필 이미지 API — 비로그인 401, 업로드→조회 왕복, 형식 검증 400, 삭제 후 404. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class ProfileImageApiTest {

  private static final String URL = "/api/v1/users/me/profile-image";

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private MockMvc mockMvc;
  @Autowired private AppUserRepository userRepository;
  @Autowired private DataSource dataSource;

  private Long userId;

  @BeforeEach
  void setUp() {
    new JdbcTemplate(dataSource).update("TRUNCATE app_user CASCADE");
    userId = userRepository.save(AppUser.of("google", "u-img", "img@example.com")).getId();
  }

  private RequestPostProcessor loginAsUser() {
    return oauth2Login()
        .attributes(
            attrs -> {
              attrs.put("provider", "google");
              attrs.put("provider_uid", "u-img");
              attrs.put("email", "img@example.com");
              attrs.put("user_id", userId);
            });
  }

  private MockMultipartFile pngImage(byte[] bytes) {
    return new MockMultipartFile("image", "avatar.png", "image/png", bytes);
  }

  @Test
  @DisplayName("비로그인 조회는 401이다")
  void findWithoutLoginIsUnauthorized() throws Exception {
    mockMvc.perform(get(URL)).andExpect(status().isUnauthorized());
  }

  @Test
  @DisplayName("업로드(204) 후 조회하면 저장한 바이트와 Content-Type이 그대로다")
  void uploadThenFindRoundTrip() throws Exception {
    byte[] bytes = new byte[] {9, 8, 7};
    mockMvc
        .perform(multipart(HttpMethod.PUT, URL).file(pngImage(bytes)).with(loginAsUser()))
        .andExpect(status().isNoContent());

    mockMvc
        .perform(get(URL).with(loginAsUser()))
        .andExpect(status().isOk())
        .andExpect(content().contentType("image/png"))
        .andExpect(content().bytes(bytes));
  }

  @Test
  @DisplayName("이미지 형식이 아니면 400 INVALID_PARAM이다")
  void uploadRejectsUnsupportedType() throws Exception {
    MockMultipartFile pdf =
        new MockMultipartFile("image", "doc.pdf", "application/pdf", new byte[] {1});

    mockMvc
        .perform(multipart(HttpMethod.PUT, URL).file(pdf).with(loginAsUser()))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PARAM"));
  }

  @Test
  @DisplayName("삭제하면 조회가 404로 돌아간다(기본 이미지 상태)")
  void removeThenFindIsNotFound() throws Exception {
    mockMvc
        .perform(multipart(HttpMethod.PUT, URL).file(pngImage(new byte[] {1})).with(loginAsUser()))
        .andExpect(status().isNoContent());

    mockMvc.perform(delete(URL).with(loginAsUser())).andExpect(status().isNoContent());

    mockMvc.perform(get(URL).with(loginAsUser())).andExpect(status().isNotFound());
  }
}
