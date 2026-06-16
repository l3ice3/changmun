package com.changmun.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.changmun.support.TestOpportunity;
import java.time.LocalDate;
import java.time.ZoneId;
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
import org.springframework.test.web.servlet.ResultActions;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 리스트 API 전 구간(E2E) — 서버 계산 필드·빈 상태·파라미터 검증. AC-012·013·014. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class OpportunityApiTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private MockMvc mockMvc;
  @Autowired private DataSource dataSource;

  private JdbcTemplate jdbc;
  private LocalDate today;

  @BeforeEach
  void setUp() {
    jdbc = new JdbcTemplate(dataSource);
    jdbc.update("TRUNCATE opportunity");
    today = LocalDate.now(ZoneId.of("Asia/Seoul"));
  }

  private void insertPreStartup(LocalDate deadline) {
    new TestOpportunity().title("예비창업패키지").stages("PRE_STARTUP").deadline(deadline).insert(jdbc);
  }

  private ResultActions getOpportunities(String name, String value) throws Exception {
    return mockMvc.perform(get("/api/v1/opportunities").param(name, value));
  }

  @Test
  @DisplayName("status·dDay·closingSoon·badges가 서버 응답에 계산돼 있다 (AC-013)")
  void computedFieldsAreInResponse() throws Exception {
    insertPreStartup(today.plusDays(3));

    ResultActions result = getOpportunities("persona", "PRE_STARTUP");

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.items[0].status").value("OPEN"));
    result.andExpect(jsonPath("$.items[0].dDay").value(3));
    result.andExpect(jsonPath("$.items[0].closingSoon").value(true));
    result.andExpect(jsonPath("$.items[0].isAlwaysOpen").value(false));
    result.andExpect(jsonPath("$.items[0].badges").value(hasItem("NO_BIZ_REQUIRED")));
  }

  @Test
  @DisplayName("결과 0건이면 200 + 빈 items다 (AC-012)")
  void emptyResultReturnsOkWithEmptyItems() throws Exception {
    ResultActions result = getOpportunities("persona", "UNIV_STUDENT");

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.items").isEmpty());
    result.andExpect(jsonPath("$.totalItems").value(0));
  }

  @Test
  @DisplayName("잘못된 persona는 400 INVALID_PARAM이다 (AC-014)")
  void invalidPersonaReturnsBadRequest() throws Exception {
    ResultActions result = getOpportunities("persona", "INVALID_VALUE");

    result.andExpect(status().isBadRequest());
    result.andExpect(jsonPath("$.code").value("INVALID_PARAM"));
  }

  @Test
  @DisplayName("1글자 검색어는 400이다 (AC-014·020)")
  void singleCharQueryReturnsBadRequest() throws Exception {
    ResultActions result = getOpportunities("q", "창");

    result.andExpect(status().isBadRequest());
    result.andExpect(jsonPath("$.code").value("INVALID_PARAM"));
  }

  @Test
  @DisplayName("ids= 조회는 다른 필터를 무시하고 요청 순서대로 해당 공고만 반환한다 (AC-022·023)")
  void bookmarkIdsQueryReturnsRequestedInOrder() throws Exception {
    long first = new TestOpportunity().title("찜A").deadline(today.plusDays(5)).insert(jdbc);
    long second = new TestOpportunity().title("찜B").deadline(today.plusDays(5)).insert(jdbc);

    ResultActions result =
        mockMvc.perform(get("/api/v1/opportunities").param("ids", second + "," + first));

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.items.length()").value(2));
    result.andExpect(jsonPath("$.items[0].title").value("찜B"));
  }

  @Test
  @DisplayName("범위를 넘는 page는 에러가 아니라 200 + 빈 items다 (AC-014)")
  void pageBeyondRangeReturnsOkWithEmptyItems() throws Exception {
    insertPreStartup(today.plusDays(3));

    ResultActions result = getOpportunities("page", "9999");

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.items").isEmpty());
  }
}
