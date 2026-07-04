package com.changmun.user.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;

/**
 * 로그인 사용자 — db/migrations `app_user` 스키마와 1:1 (data-model.md §8).
 *
 * <p>PII 최소 수집: 소셜 제공자(provider)와 그 제공자의 사용자 식별자(provider_uid)로 유일하게 식별하고, 이메일만 보관한다(액세스 토큰·프로필 미저장
 * — 절대규칙 6의 최소수집 취지). 제공자별로 1행이며, 서로 다른 제공자 계정 연결은 후속 과제.
 */
@Entity
@Table(name = "app_user")
@Getter
public class AppUser {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "email")
  private String email;

  @Column(name = "provider")
  private String provider;

  @Column(name = "provider_uid")
  private String providerUid;

  @Column(name = "created_at", insertable = false, updatable = false)
  private Instant createdAt;

  protected AppUser() {}

  private AppUser(String provider, String providerUid, String email) {
    this.provider = provider;
    this.providerUid = providerUid;
    this.email = email;
  }

  /** 로그인 시 신규 사용자 생성 — provider 식별 + 이메일. */
  public static AppUser of(String provider, String providerUid, String email) {
    return new AppUser(provider, providerUid, email);
  }
}
