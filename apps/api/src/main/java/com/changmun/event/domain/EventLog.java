package com.changmun.event.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.Map;
import java.util.UUID;
import lombok.Getter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * 행동 로그 — db/migrations/V2 event_log 1:1 (append-only). 익명 UUID + 화이트리스트 payload 키만 저장(PII 금지).
 * received_at은 DB 기본값(now())이 채우므로 매핑하지 않는다.
 */
@Entity
@Table(name = "event_log")
@Getter
public class EventLog {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  @Column(name = "id")
  private Long id;

  @Column(name = "client_id")
  private UUID clientId;

  @Column(name = "event_type")
  private String eventType;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "payload")
  private Map<String, Object> payload;

  @Column(name = "occurred_at")
  private Instant occurredAt;

  protected EventLog() {
    // JPA 전용
  }

  public EventLog(
      UUID clientId, String eventType, Map<String, Object> payload, Instant occurredAt) {
    this.clientId = clientId;
    this.eventType = eventType;
    this.payload = payload;
    this.occurredAt = occurredAt;
  }
}
