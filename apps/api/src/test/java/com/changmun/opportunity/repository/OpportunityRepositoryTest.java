package com.changmun.opportunity.repository;

import static org.assertj.core.api.Assertions.assertThat;

import com.changmun.opportunity.domain.Opportunity;
import com.changmun.opportunity.domain.Persona;
import com.changmun.opportunity.repository.OpportunitySearchCriteria.Filters;
import com.changmun.opportunity.support.TestOpportunity;
import java.time.LocalDate;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase.Replace;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

/** 리포지토리 네이티브 쿼리 슬라이스 — 실 PostgreSQL(Testcontainers). AC-011·CC-05. */
@DataJpaTest
@AutoConfigureTestDatabase(replace = Replace.NONE)
@Testcontainers
class OpportunityRepositoryTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16");

  private static final Pageable FIRST_PAGE = PageRequest.of(0, 20);

  @Autowired private OpportunityRepository repository;
  @Autowired private DataSource dataSource;

  private JdbcTemplate jdbc;
  private LocalDate today;

  @BeforeEach
  void setUp() {
    jdbc = new JdbcTemplate(dataSource);
    today = LocalDate.now();
  }

  private static OpportunitySearchCriteria persona(Persona persona) {
    return OpportunitySearchCriteria.of(persona, openFilters());
  }

  private static OpportunitySearchCriteria filters(Filters filters) {
    return OpportunitySearchCriteria.of(null, filters);
  }

  // Filters 조립 헬퍼 — 각 테스트는 관심 축 하나만 지정한다(나머지는 필터 없음).
  private static Filters openFilters() {
    return new Filters(null, null, null, null, true, false, null);
  }

  private static Filters allStatusFilters() {
    return new Filters(null, null, null, null, false, false, null);
  }

  private static Filters regionFilters(String region) {
    return new Filters(region, null, null, null, true, false, null);
  }

  private static Filters queryFilters(String query) {
    return new Filters(null, null, null, query, true, false, null);
  }

  private static Filters amountFilters(boolean requireAmount, Long minAmount) {
    return new Filters(null, null, null, null, true, requireAmount, minAmount);
  }

  private void preStartup(String title, LocalDate deadline) {
    new TestOpportunity().title(title).stages("PRE_STARTUP").deadline(deadline).insert(jdbc);
  }

  private Page<Opportunity> byDeadline(OpportunitySearchCriteria criteria) {
    return repository.searchByDeadline(criteria, FIRST_PAGE);
  }

  @Test
  @DisplayName("페르소나 탭은 마감임박순으로, 상시(deadline NULL)는 맨 뒤로 정렬한다 (AC-011)")
  void personaSortsByDeadlineNullsLast() {
    preStartup("예비-D10", today.plusDays(10));
    preStartup("예비-D3", today.plusDays(3));
    new TestOpportunity().title("예비-상시").stages("PRE_STARTUP").alwaysOpen(true).insert(jdbc);

    Page<Opportunity> page = byDeadline(persona(Persona.PRE_STARTUP));

    assertThat(page.getContent())
        .extracting(Opportunity::getTitle)
        .containsExactly("예비-D3", "예비-D10", "예비-상시");
  }

  @Test
  @DisplayName("페르소나 탭은 canonical이고 해당 페르소나인 공고만 반환한다 (AC-011·CC-05)")
  void personaReturnsOnlyCanonicalMatches() {
    preStartup("예비-대표", today.plusDays(3));
    new TestOpportunity().title("예비-비대표").stages("PRE_STARTUP").canonical(false).insert(jdbc);
    new TestOpportunity().title("초기").stages("LT_5Y").deadline(today.plusDays(1)).insert(jdbc);

    Page<Opportunity> page = byDeadline(persona(Persona.PRE_STARTUP));

    assertThat(page.getContent()).extracting(Opportunity::getTitle).containsExactly("예비-대표");
  }

  @Test
  @DisplayName("초기창업자 탭은 업력 LT_1Y·LT_2Y·LT_3Y 중 하나라도 겹치면 잡고 그 외는 제외한다")
  void earlyStageMatchesAnyOfThreeStages() {
    new TestOpportunity().title("LT_2Y공고").stages("LT_2Y").deadline(today.plusDays(5)).insert(jdbc);
    new TestOpportunity().title("LT_5Y공고").stages("LT_5Y").deadline(today.plusDays(5)).insert(jdbc);

    Page<Opportunity> page = byDeadline(persona(Persona.EARLY_STAGE));

    assertThat(page.getContent()).extracting(Opportunity::getTitle).containsExactly("LT_2Y공고");
  }

  @Test
  @DisplayName("status=open은 CLOSED만 빼고 진행중·상시·기간미상을 포함한다")
  void statusOpenExcludesOnlyClosed() {
    new TestOpportunity().title("진행중").deadline(today.plusDays(5)).insert(jdbc);
    new TestOpportunity().title("상시").alwaysOpen(true).insert(jdbc);
    new TestOpportunity().title("기간미상").insert(jdbc);
    new TestOpportunity().title("마감").deadline(today.minusDays(5)).insert(jdbc);

    Page<Opportunity> page = byDeadline(filters(openFilters()));

    assertThat(page.getContent())
        .extracting(Opportunity::getTitle)
        .containsExactlyInAnyOrder("진행중", "상시", "기간미상");
  }

  @Test
  @DisplayName("status=all은 마감 공고까지 포함한다")
  void statusAllIncludesClosed() {
    new TestOpportunity().title("진행중").deadline(today.plusDays(5)).insert(jdbc);
    new TestOpportunity().title("마감").deadline(today.minusDays(5)).insert(jdbc);

    Page<Opportunity> page = byDeadline(filters(allStatusFilters()));

    assertThat(page.getContent())
        .extracting(Opportunity::getTitle)
        .containsExactlyInAnyOrder("진행중", "마감");
  }

  @Test
  @DisplayName("지역 필터는 정확히 일치하는 시도만 반환한다")
  void regionFilterMatchesExactSido() {
    new TestOpportunity().title("서울공고").region("서울").deadline(today.plusDays(5)).insert(jdbc);
    new TestOpportunity().title("부산공고").region("부산").deadline(today.plusDays(5)).insert(jdbc);

    Page<Opportunity> page = byDeadline(filters(regionFilters("서울")));

    assertThat(page.getContent()).extracting(Opportunity::getTitle).containsExactly("서울공고");
  }

  @Test
  @DisplayName("복수 지역 공고는 각 지역 필터 모두에 잡힌다 — region TEXT[] 멤버십")
  void multiRegionMatchesEachSido() {
    new TestOpportunity()
        .title("수도권공고")
        .region("서울", "경기")
        .deadline(today.plusDays(5))
        .insert(jdbc);

    assertThat(byDeadline(filters(regionFilters("서울"))).getContent())
        .extracting(Opportunity::getTitle)
        .containsExactly("수도권공고");
    assertThat(byDeadline(filters(regionFilters("경기"))).getContent())
        .extracting(Opportunity::getTitle)
        .containsExactly("수도권공고");
  }

  @Test
  @DisplayName("부분일치 검색(q)이 동작한다 — pg_trgm ILIKE (AC-019)")
  void searchMatchesPartialTitle() {
    new TestOpportunity().title("청년창업사관학교 모집").deadline(today.plusDays(5)).insert(jdbc);
    new TestOpportunity().title("관련 없는 공고").deadline(today.plusDays(5)).insert(jdbc);

    Page<Opportunity> page = byDeadline(filters(queryFilters("창업사관")));

    assertThat(page.getContent()).extracting(Opportunity::getTitle).containsExactly("청년창업사관학교 모집");
  }

  @Test
  @DisplayName("SQL 메타·인젝션 문자열은 0건으로 안전 처리되고 테이블은 그대로다 (AC-021)")
  void searchInjectionIsSafe() {
    new TestOpportunity().title("정상공고").deadline(today.plusDays(5)).insert(jdbc);
    Filters injection = queryFilters("'; DROP TABLE opportunity;-- %_");

    Page<Opportunity> injected = byDeadline(filters(injection));
    Page<Opportunity> survived = byDeadline(filters(queryFilters("정상")));

    assertThat(injected.getContent()).isEmpty();
    assertThat(survived.getContent()).extracting(Opportunity::getTitle).containsExactly("정상공고");
  }

  @Test
  @DisplayName("검색어의 %·_ 는 와일드카드가 아니라 리터럴로 처리된다 (AC-021)")
  void searchWildcardsAreTreatedAsLiteral() {
    new TestOpportunity().title("정상공고").deadline(today.plusDays(5)).insert(jdbc);

    Page<Opportunity> page = byDeadline(filters(queryFilters("__")));

    assertThat(page.getContent()).isEmpty();
  }

  @Test
  @DisplayName("ids 조회는 요청 순서를 보존하고 없는 id는 건너뛴다 (AC-023)")
  void idsPreserveOrderAndSkipMissing() {
    long first = new TestOpportunity().title("공고A").deadline(today.plusDays(5)).insert(jdbc);
    long second = new TestOpportunity().title("공고B").deadline(today.plusDays(5)).insert(jdbc);

    List<Opportunity> found = repository.findByIdsInOrder(new Long[] {second, 999_999L, first});

    assertThat(found).extracting(Opportunity::getTitle).containsExactly("공고B", "공고A");
  }

  @Test
  @DisplayName("ids 조회는 canonical이 아니어도 반환한다 — 강등돼도 유지 (AC-024)")
  void idsReturnNonCanonical() {
    long demoted =
        new TestOpportunity()
            .title("강등됨")
            .canonical(false)
            .deadline(today.plusDays(5))
            .insert(jdbc);

    List<Opportunity> found = repository.findByIdsInOrder(new Long[] {demoted});

    assertThat(found).extracting(Opportunity::getTitle).containsExactly("강등됨");
  }

  @Test
  @DisplayName("최신순 정렬은 first_seen_at 내림차순으로 반환한다")
  void latestSortOrdersByFirstSeenDesc() {
    new TestOpportunity().title("먼저수집").deadline(today.plusDays(1)).insert(jdbc);
    new TestOpportunity().title("나중수집").deadline(today.plusDays(9)).insert(jdbc);

    Page<Opportunity> page = repository.searchByLatest(filters(openFilters()), FIRST_PAGE);

    assertThat(page.getContent()).extracting(Opportunity::getTitle).containsExactly("나중수집", "먼저수집");
  }

  private void amountRow(String title, String stage, Long maxSupportAmount) {
    TestOpportunity row = new TestOpportunity().title(title).maxSupportAmount(maxSupportAmount);
    if (stage != null) {
      row.stages(stage);
    }
    row.deadline(today.plusDays(5)).insert(jdbc);
  }

  @Test
  @DisplayName("hasAmount=true는 최대 지원액이 확인된 공고만 반환한다 (AC-031)")
  void hasAmountReturnsOnlyAmountConfirmed() {
    amountRow("1억공고", null, 100_000_000L);
    amountRow("5천만공고", null, 50_000_000L);
    amountRow("금액미상", null, null);

    Page<Opportunity> page = byDeadline(filters(amountFilters(true, null)));

    assertThat(page.getContent())
        .extracting(Opportunity::getTitle)
        .containsExactlyInAnyOrder("1억공고", "5천만공고");
  }

  @Test
  @DisplayName("minAmount는 하한 이상만 반환하고 금액 미상(NULL)은 제외한다 (AC-031)")
  void minAmountFiltersBelowThresholdAndNull() {
    amountRow("1억공고", null, 100_000_000L);
    amountRow("5천만공고", null, 50_000_000L);
    amountRow("금액미상", null, null);

    Page<Opportunity> page = byDeadline(filters(amountFilters(false, 80_000_000L)));

    assertThat(page.getContent()).extracting(Opportunity::getTitle).containsExactly("1억공고");
  }

  @Test
  @DisplayName("지원금 필터는 페르소나 필터와 AND로 조합된다 (AC-031)")
  void amountFilterCombinesWithPersona() {
    amountRow("예비-1억", "PRE_STARTUP", 100_000_000L);
    amountRow("초기-1억", "LT_2Y", 100_000_000L);
    amountRow("예비-금액미상", "PRE_STARTUP", null);

    Page<Opportunity> page =
        byDeadline(
            OpportunitySearchCriteria.of(Persona.PRE_STARTUP, amountFilters(false, 50_000_000L)));

    assertThat(page.getContent()).extracting(Opportunity::getTitle).containsExactly("예비-1억");
  }
}
