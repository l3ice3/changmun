package com.changmun.opportunity.controller;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.changmun.opportunity.support.TestOpportunity;
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

/** 상세·용어풀이 E2E — Flyway 시드 glossary로 matchedTerms 검증. AC-015·016·017·018. */
@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
class DetailAndGlossaryApiTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  @Autowired private MockMvc mockMvc;
  @Autowired private DataSource dataSource;

  private JdbcTemplate jdbc;
  private LocalDate today;

  @BeforeEach
  void setUp() {
    jdbc = new JdbcTemplate(dataSource);
    jdbc.update("TRUNCATE opportunity CASCADE");
    today = LocalDate.now(ZoneId.of("Asia/Seoul"));
  }

  private long insertWithGlossaryTerm() {
    return new TestOpportunity()
        .title("예비창업패키지")
        .organization("중소벤처기업부")
        .summary("본 사업은 예비창업자에게 사업화자금을 지원합니다")
        .eligibilityDetail("사업자등록 이력이 없는 예비창업자")
        .deadline(today.plusDays(10))
        .insert(jdbc);
  }

  private ResultActions getDetail(long id) throws Exception {
    return mockMvc.perform(get("/api/v1/opportunities/{id}", id));
  }

  @Test
  @DisplayName("상세는 필수 정보와 매칭된 용어풀이를 함께 보여준다 (AC-015)")
  void detailIncludesFieldsAndMatchedTerms() throws Exception {
    ResultActions result = getDetail(insertWithGlossaryTerm());

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.title").value("예비창업패키지"));
    result.andExpect(jsonPath("$.organization").value("중소벤처기업부"));
    result.andExpect(jsonPath("$.summary").value(containsString("사업화자금")));
    result.andExpect(jsonPath("$.matchedTerms[*].term").value(hasItem("사업화자금")));
  }

  @Test
  @DisplayName("존재하지 않는 id는 404 NOT_FOUND다 (AC-016)")
  void missingIdReturnsNotFound() throws Exception {
    ResultActions result = getDetail(999_999_999L);

    result.andExpect(status().isNotFound());
    result.andExpect(jsonPath("$.code").value("NOT_FOUND"));
  }

  @Test
  @DisplayName("apply_url이 없으면 applyUrl은 null이고 detailUrl만 채워진다 (AC-017)")
  void noApplyUrlLeavesApplyUrlNull() throws Exception {
    long id = new TestOpportunity().title("신청URL없음").deadline(today.plusDays(5)).insert(jdbc);

    ResultActions result = getDetail(id);

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.detailUrl").isNotEmpty());
    result.andExpect(jsonPath("$.applyUrl").value(nullValue()));
  }

  @Test
  @DisplayName("마감된 공고도 200으로 열리고 status=CLOSED다 (AC-018)")
  void closedOpportunityStillOpensWithClosedStatus() throws Exception {
    long id = new TestOpportunity().title("마감공고").deadline(today.minusDays(5)).insert(jdbc);

    ResultActions result = getDetail(id);

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.status").value("CLOSED"));
  }

  @Test
  @DisplayName("용어 사전 전체가 반환된다 (시드 포함)")
  void glossaryReturnsSeededTerms() throws Exception {
    ResultActions result = mockMvc.perform(get("/api/v1/glossary"));

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.items").isNotEmpty());
    result.andExpect(jsonPath("$.items[*].term").value(hasItem("업력")));
  }
}
