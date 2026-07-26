package com.changmun.event.dto;

import com.changmun.common.web.InvalidParameterException;
import com.changmun.event.domain.EventLog;
import com.changmun.event.domain.EventType;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * POST /api/v1/events 요청 (api-spec.md §4). eventType은 화이트리스트, payload 키도 화이트리스트 — 그 외 키는 거부(PII 차단
 * 장치, AC-027). 검증 실패는 {@link InvalidParameterException} → 400.
 */
public record EventRequest(
    UUID clientId, String eventType, Map<String, Object> payload, OffsetDateTime occurredAt) {

  private static final Set<String> ALLOWED_PAYLOAD_KEYS =
      Set.of(
          "opportunityId",
          "persona",
          "region",
          "category",
          "source",
          "statusFilter",
          "q",
          "page",
          "linkType",
          "resultCount",
          "hasAmount",
          "minAmount");

  public EventLog toEventLog(Instant fallback) {
    validate();
    return new EventLog(clientId, eventType, payload, occurredAtOrDefault(fallback));
  }

  private void validate() {
    if (clientId == null) {
      throw new InvalidParameterException("clientId", "null");
    }
    if (!EventType.isAllowed(eventType)) {
      throw new InvalidParameterException("eventType", String.valueOf(eventType));
    }
    validatePayloadKeys();
  }

  private void validatePayloadKeys() {
    if (payload == null) {
      return;
    }
    for (String key : payload.keySet()) {
      if (!ALLOWED_PAYLOAD_KEYS.contains(key)) {
        throw new InvalidParameterException("payload", key);
      }
    }
  }

  private Instant occurredAtOrDefault(Instant fallback) {
    if (occurredAt == null) {
      return fallback;
    }
    return occurredAt.toInstant();
  }
}
