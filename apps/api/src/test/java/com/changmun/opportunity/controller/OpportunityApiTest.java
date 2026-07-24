package com.changmun.opportunity.controller;

import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.changmun.opportunity.support.TestOpportunity;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
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
    jdbc.update("TRUNCATE opportunity CASCADE");
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
  @DisplayName("/stats — canonical 기준 진행 중·오늘 뜬·마감임박 공고 수를 센다")
  void statsCountsCanonicalOpenNewTodayAndClosingSoon() throws Exception {
    new TestOpportunity().deadline(today.plusDays(3)).insert(jdbc); // 진행 중 + 마감임박
    new TestOpportunity().deadline(today.plusDays(30)).insert(jdbc); // 진행 중
    new TestOpportunity().deadline(today.minusDays(1)).insert(jdbc); // 마감 — 진행 중 아님
    new TestOpportunity()
        .canonical(false)
        .deadline(today.plusDays(3))
        .insert(jdbc); // 비canonical — 제외
    new TestOpportunity()
        .deadline(today.plusDays(3))
        .firstSeenAt(OffsetDateTime.now(ZoneOffset.UTC))
        .insert(jdbc); // 진행 중 + 마감임박 + 오늘 뜬

    ResultActions result = mockMvc.perform(get("/api/v1/opportunities/stats"));

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.open").value(3));
    result.andExpect(jsonPath("$.newToday").value(1));
    result.andExpect(jsonPath("$.closingSoon").value(2));
  }

  @Test
  @DisplayName("범위를 넘는 page는 에러가 아니라 200 + 빈 items다 (AC-014)")
  void pageBeyondRangeReturnsOkWithEmptyItems() throws Exception {
    insertPreStartup(today.plusDays(3));

    ResultActions result = getOpportunities("page", "9999");

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.items").isEmpty());
  }

  @Test
  @DisplayName("source 필터는 해당 출처 공고만 반환한다")
  void sourceFilterReturnsOnlyThatSource() throws Exception {
    new TestOpportunity().source("k-startup").deadline(today.plusDays(5)).insert(jdbc);
    new TestOpportunity().source("ontong-youth").deadline(today.plusDays(5)).insert(jdbc);
    new TestOpportunity().source("bizinfo").deadline(today.plusDays(5)).insert(jdbc);

    ResultActions result = getOpportunities("source", "ontong-youth");

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.items.length()").value(1));
    result.andExpect(jsonPath("$.items[0].source").value("ontong-youth"));
  }

  @Test
  @DisplayName("잘못된 source는 400 INVALID_PARAM이다 (AC-014)")
  void invalidSourceReturnsBadRequest() throws Exception {
    ResultActions result = getOpportunities("source", "naver");

    result.andExpect(status().isBadRequest());
    result.andExpect(jsonPath("$.code").value("INVALID_PARAM"));
  }

  @Test
  @DisplayName("리스트 응답에 supportAmount·maxSupportAmount가 실리고 미상이면 null이다 (AC-032)")
  void amountFieldsAreInListResponse() throws Exception {
    new TestOpportunity()
        .title("금액공고")
        .supportAmount("최대 1억원")
        .maxSupportAmount(100_000_000L)
        .deadline(today.plusDays(3))
        .insert(jdbc);
    new TestOpportunity().title("미상공고").deadline(today.plusDays(5)).insert(jdbc);

    ResultActions result = mockMvc.perform(get("/api/v1/opportunities"));

    result.andExpect(status().isOk());
    result.andExpect(jsonPath("$.items[0].supportAmount").value("최대 1억원"));
    result.andExpect(jsonPath("$.items[0].maxSupportAmount").value(100_000_000L));
    result.andExpect(jsonPath("$.items[1].supportAmount").isEmpty());
    result.andExpect(jsonPath("$.items[1].maxSupportAmount").isEmpty());
  }

  @Test
  @DisplayName("hasAmount=true·minAmount가 요청부터 응답까지 걸러 반환한다 (AC-031)")
  void amountFiltersAreWiredEndToEnd() throws Exception {
    new TestOpportunity()
        .title("1억공고")
        .maxSupportAmount(100_000_000L)
        .deadline(today.plusDays(3))
        .insert(jdbc);
    new TestOpportunity()
        .title("5천만공고")
        .maxSupportAmount(50_000_000L)
        .deadline(today.plusDays(5))
        .insert(jdbc);
    new TestOpportunity().title("금액미상").deadline(today.plusDays(5)).insert(jdbc);

    ResultActions hasAmount = getOpportunities("hasAmount", "true");
    hasAmount.andExpect(status().isOk());
    hasAmount.andExpect(jsonPath("$.items.length()").value(2));

    ResultActions minAmount = getOpportunities("minAmount", "80000000");
    minAmount.andExpect(status().isOk());
    minAmount.andExpect(jsonPath("$.items.length()").value(1));
    minAmount.andExpect(jsonPath("$.items[0].title").value("1억공고"));
  }

  @Test
  @DisplayName("잘못된 hasAmount·비숫자/음수 minAmount는 400 INVALID_PARAM이다 (AC-033)")
  void invalidAmountParamsReturnBadRequest() throws Exception {
    getOpportunities("hasAmount", "yes")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PARAM"));
    getOpportunities("minAmount", "abc")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PARAM"));
    getOpportunities("minAmount", "-1")
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("INVALID_PARAM"));
  }
}
