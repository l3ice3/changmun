package com.changmun.opportunity.support;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.BeanPropertySqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;

/**
 * 리포지토리/통합 테스트용 opportunity 행 빌더. 엔티티는 NOT NULL external_id 등을 세팅할 수 없어 JdbcTemplate로 직접 적재한다. 기본값은
 * 진행 중 canonical K-Startup 공고이며, 필요한 축만 fluent로 바꿔 끼운다.
 *
 * <p>적재는 BeanPropertySqlParameterSource(getter 반사 매핑)로 한다 — 20여 컬럼을 위치 인자로 나열하면 메서드 길이 제한을 넘기 때문이다.
 * 배열 컬럼 getter는 PostgreSQL 배열 리터럴 문자열을 돌려주고 SQL에서 ::text[]로 캐스팅한다.
 */
@SuppressWarnings("PMD.TooManyFields") // 테스트 픽스처 — 스키마 컬럼을 유연하게 채우기 위한 빌더.
public final class TestOpportunity {

  private static final AtomicLong SEQUENCE = new AtomicLong(1);
  private static final OffsetDateTime BASE_TIME =
      OffsetDateTime.of(2026, 1, 1, 0, 0, 0, 0, ZoneOffset.UTC);

  private static final String INSERT =
      """
      INSERT INTO opportunity (
        source, external_id, title, detail_url, is_canonical,
        application_start_date, application_deadline, is_always_open,
        target_startup_stage, target_audience_type, category, region,
        summary, eligibility_detail, organization, organization_type,
        support_amount, max_support_amount, apply_url, dedup_group_id, first_seen_at)
      VALUES (
        :source, :externalId, :title, :detailUrl, :canonical,
        :startDate, :deadline, :alwaysOpen,
        :stages::text[], :audiences::text[], :category, :region::text[],
        :summary, :eligibilityDetail, :organization, :organizationType,
        :supportAmount, :maxSupportAmount, :applyUrl, :dedupGroupId, :firstSeenAt)
      RETURNING id
      """;

  private String source = "k-startup";
  private String externalId;
  private String title = "테스트 공고";
  private String detailUrl;
  private boolean canonical = true;
  private LocalDate startDate;
  private LocalDate deadline;
  private boolean alwaysOpen;
  private List<String> stages;
  private List<String> audiences;
  private String category;
  private List<String> region;
  private String summary;
  private String eligibilityDetail;
  private String organization;
  private String organizationType;
  private String supportAmount;
  private Long maxSupportAmount;
  private String applyUrl;
  private Long dedupGroupId;
  private OffsetDateTime firstSeenAt;

  public TestOpportunity() {
    long seq = SEQUENCE.getAndIncrement();
    this.externalId = "ext-" + seq;
    this.detailUrl = "https://example.test/notice/" + seq;
    this.firstSeenAt = BASE_TIME.plusSeconds(seq);
  }

  public TestOpportunity source(String value) {
    this.source = value;
    return this;
  }

  public TestOpportunity externalId(String value) {
    this.externalId = value;
    return this;
  }

  public TestOpportunity title(String value) {
    this.title = value;
    return this;
  }

  public TestOpportunity canonical(boolean value) {
    this.canonical = value;
    return this;
  }

  public TestOpportunity startDate(LocalDate value) {
    this.startDate = value;
    return this;
  }

  public TestOpportunity deadline(LocalDate value) {
    this.deadline = value;
    return this;
  }

  public TestOpportunity alwaysOpen(boolean value) {
    this.alwaysOpen = value;
    return this;
  }

  public TestOpportunity stages(String... values) {
    this.stages = List.of(values);
    return this;
  }

  public TestOpportunity audiences(String... values) {
    this.audiences = List.of(values);
    return this;
  }

  public TestOpportunity category(String value) {
    this.category = value;
    return this;
  }

  public TestOpportunity region(String... values) {
    this.region = List.of(values);
    return this;
  }

  public TestOpportunity summary(String value) {
    this.summary = value;
    return this;
  }

  public TestOpportunity eligibilityDetail(String value) {
    this.eligibilityDetail = value;
    return this;
  }

  public TestOpportunity organization(String value) {
    this.organization = value;
    return this;
  }

  public TestOpportunity organizationType(String value) {
    this.organizationType = value;
    return this;
  }

  public TestOpportunity supportAmount(String value) {
    this.supportAmount = value;
    return this;
  }

  public TestOpportunity maxSupportAmount(Long value) {
    this.maxSupportAmount = value;
    return this;
  }

  public TestOpportunity applyUrl(String value) {
    this.applyUrl = value;
    return this;
  }

  public TestOpportunity dedupGroupId(Long value) {
    this.dedupGroupId = value;
    return this;
  }

  public TestOpportunity firstSeenAt(OffsetDateTime value) {
    this.firstSeenAt = value;
    return this;
  }

  public long insert(JdbcTemplate jdbc) {
    NamedParameterJdbcTemplate named = new NamedParameterJdbcTemplate(jdbc);
    return named.queryForObject(INSERT, new BeanPropertySqlParameterSource(this), Long.class);
  }

  public String getSource() {
    return source;
  }

  public String getExternalId() {
    return externalId;
  }

  public String getTitle() {
    return title;
  }

  public String getDetailUrl() {
    return detailUrl;
  }

  public boolean isCanonical() {
    return canonical;
  }

  public LocalDate getStartDate() {
    return startDate;
  }

  public LocalDate getDeadline() {
    return deadline;
  }

  public boolean isAlwaysOpen() {
    return alwaysOpen;
  }

  public String getStages() {
    return literal(stages);
  }

  public String getAudiences() {
    return literal(audiences);
  }

  public String getCategory() {
    return category;
  }

  public String getRegion() {
    return literal(region);
  }

  public String getSummary() {
    return summary;
  }

  public String getEligibilityDetail() {
    return eligibilityDetail;
  }

  public String getOrganization() {
    return organization;
  }

  public String getOrganizationType() {
    return organizationType;
  }

  public String getSupportAmount() {
    return supportAmount;
  }

  public Long getMaxSupportAmount() {
    return maxSupportAmount;
  }

  public String getApplyUrl() {
    return applyUrl;
  }

  public Long getDedupGroupId() {
    return dedupGroupId;
  }

  public OffsetDateTime getFirstSeenAt() {
    return firstSeenAt;
  }

  private static String literal(List<String> codes) {
    if (codes == null) {
      return null;
    }
    return "{" + String.join(",", codes) + "}";
  }
}
