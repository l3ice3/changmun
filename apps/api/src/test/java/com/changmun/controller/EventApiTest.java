package com.changmun.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 행동 로그 적재 E2E — 202·적재·payload 화이트리스트. AC-025·027. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class EventApiTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private MockMvc mockMvc;
  @Autowired private DataSource dataSource;

  private JdbcTemplate jdbc;

  @BeforeEach
  void setUp() {
    jdbc = new JdbcTemplate(dataSource);
    jdbc.update("TRUNCATE event_log");
  }

  private ResultActions postEvent(String body) throws Exception {
    return mockMvc.perform(
        post("/api/v1/events").contentType(MediaType.APPLICATION_JSON).content(body));
  }

  @Test
  @DisplayName("유효 이벤트는 202로 받아들여지고 익명 UUID·payload와 함께 적재된다 (AC-025)")
  void validEventIsAcceptedAndPersisted() throws Exception {
    String body =
        """
        {"clientId":"550e8400-e29b-41d4-a716-446655440000","eventType":"outbound_click",
         "payload":{"opportunityId":1234,"linkType":"apply"}}
        """;

    ResultActions result = postEvent(body);

    result.andExpect(status().isAccepted());
    result.andExpect(jsonPath("$.accepted").value(true));
    Integer count =
        jdbc.queryForObject(
            "SELECT count(*) FROM event_log WHERE event_type = 'outbound_click'", Integer.class);
    assertThat(count).isEqualTo(1);
  }

  @Test
  @DisplayName("화이트리스트 밖 payload 키는 400 INVALID_PARAM이다 — PII 차단 (AC-027)")
  void nonWhitelistedPayloadKeyIsRejected() throws Exception {
    String body =
        """
        {"clientId":"550e8400-e29b-41d4-a716-446655440000","eventType":"search",
         "payload":{"email":"user@example.com"}}
        """;

    ResultActions result = postEvent(body);

    result.andExpect(status().isBadRequest());
    result.andExpect(jsonPath("$.code").value("INVALID_PARAM"));
  }
}
