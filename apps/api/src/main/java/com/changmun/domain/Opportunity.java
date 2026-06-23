package com.changmun.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.util.List;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 공고 원장 — db/migrations/V1 스키마와 1:1 매핑 (data-model.md §2 LOCKED).
 *
 * <p>읽기 전용 서빙이라 상태를 바꾸는 행위는 없고, 산식(status·badges)에 답하는 행위만 노출한다. 계산은 도메인 값 객체에 위임하고, 서비스가 getter를
 * 꺼내 분기하지 않게 한다(Tell, Don't Ask).
 *
 * <p>서빙에 쓰지 않는 컬럼(raw·external_id·source_status·first_seen_at 등)은 매핑하지 않는다 — ddl-auto=validate는 미매핑
 * 컬럼을 허용한다.
 */
@Entity
@Table(name = "opportunity")
@SuppressWarnings("PMD.TooManyFields") // 원장 엔티티 — LOCKED 스키마의 서빙 컬럼을 1:1로 받는다.
public class Opportunity {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "source")
  private String source;

  @Column(name = "title")
  private String title;

  @Column(name = "summary")
  private String summary;

  @Column(name = "category")
  private String category;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(name = "region", columnDefinition = "text[]")
  private List<String> region;

  @Column(name = "organization")
  private String organization;

  @Column(name = "organization_type")
  private String organizationType;

  @Column(name = "support_amount")
  private String supportAmount;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(name = "target_startup_stage", columnDefinition = "text[]")
  private List<String> targetStartupStage;

  @JdbcTypeCode(SqlTypes.ARRAY)
  @Column(name = "target_audience_type", columnDefinition = "text[]")
  private List<String> targetAudienceType;

  @Column(name = "eligibility_detail")
  private String eligibilityDetail;

  @Column(name = "application_start_date")
  private LocalDate applicationStartDate;

  @Column(name = "application_deadline")
  private LocalDate applicationDeadline;

  @Column(name = "is_always_open")
  private boolean alwaysOpen;

  @Column(name = "detail_url")
  private String detailUrl;

  @Column(name = "apply_url")
  private String applyUrl;

  @Column(name = "dedup_group_id")
  private Long dedupGroupId;

  protected Opportunity() {
    // JPA 전용
  }

  public OpportunityStatus statusOn(LocalDate today) {
    return OpportunityStatus.on(today, alwaysOpen, applicationDeadline);
  }

  public Targeting targeting() {
    return Targeting.of(targetStartupStage, targetAudienceType);
  }

  public Badges badgesOn(LocalDate today) {
    return Badges.of(statusOn(today), targeting());
  }

  public Long getId() {
    return id;
  }

  public String getSource() {
    return source;
  }

  public String getTitle() {
    return title;
  }

  public String getSummary() {
    return summary;
  }

  public String getCategory() {
    return category;
  }

  public List<String> getRegion() {
    return region;
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

  public List<String> getTargetStartupStage() {
    return targetStartupStage;
  }

  public List<String> getTargetAudienceType() {
    return targetAudienceType;
  }

  public String getEligibilityDetail() {
    return eligibilityDetail;
  }

  public LocalDate getApplicationStartDate() {
    return applicationStartDate;
  }

  public LocalDate getApplicationDeadline() {
    return applicationDeadline;
  }

  public boolean isAlwaysOpen() {
    return alwaysOpen;
  }

  public String getDetailUrl() {
    return detailUrl;
  }

  public String getApplyUrl() {
    return applyUrl;
  }

  public Long getDedupGroupId() {
    return dedupGroupId;
  }
}
