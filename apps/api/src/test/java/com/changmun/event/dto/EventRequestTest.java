package com.changmun.event.dto;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.changmun.common.web.InvalidParameterException;
import com.changmun.event.domain.EventLog;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

/** 행동 로그 요청 검증 단위 테스트 — eventType·payload 키 화이트리스트 (AC-027). */
class EventRequestTest {

  private static final UUID CLIENT = UUID.fromString("550e8400-e29b-41d4-a716-446655440000");
  private static final Instant FALLBACK = Instant.parse("2026-06-16T00:00:00Z");

  @Test
  @DisplayName("허용 이벤트·허용 payload 키는 EventLog로 변환된다")
  void validRequestBuildsLog() {
    Map<String, Object> payload = Map.of("opportunityId", 1234, "linkType", "apply");
    EventRequest request = new EventRequest(CLIENT, "outbound_click", payload, null);

    EventLog log = request.toEventLog(FALLBACK);

    assertThat(log.getClientId()).isEqualTo(CLIENT);
    assertThat(log.getEventType()).isEqualTo("outbound_click");
    assertThat(log.getOccurredAt()).isEqualTo(FALLBACK);
  }

  @Test
  @DisplayName("화이트리스트 밖 payload 키는 거부된다 — PII 차단 (AC-027)")
  void rejectsNonWhitelistedPayloadKey() {
    EventRequest request = new EventRequest(CLIENT, "search", Map.of("email", "a@b.com"), null);

    assertThatThrownBy(() -> request.toEventLog(FALLBACK))
        .isInstanceOf(InvalidParameterException.class);
  }

  @Test
  @DisplayName("화이트리스트 밖 eventType은 거부된다")
  void rejectsUnknownEventType() {
    EventRequest request = new EventRequest(CLIENT, "hack_event", Map.of(), null);

    assertThatThrownBy(() -> request.toEventLog(FALLBACK))
        .isInstanceOf(InvalidParameterException.class);
  }

  @Test
  @DisplayName("clientId가 없으면 거부된다")
  void rejectsMissingClientId() {
    EventRequest request = new EventRequest(null, "search", null, null);

    assertThatThrownBy(() -> request.toEventLog(FALLBACK))
        .isInstanceOf(InvalidParameterException.class);
  }

  @Test
  @DisplayName("occurredAt이 주어지면 그 시각을 쓴다")
  void usesProvidedOccurredAt() {
    OffsetDateTime when = OffsetDateTime.parse("2026-06-10T12:34:56+09:00");
    EventRequest request = new EventRequest(CLIENT, "search", null, when);

    EventLog log = request.toEventLog(FALLBACK);

    assertThat(log.getOccurredAt()).isEqualTo(when.toInstant());
  }
}
