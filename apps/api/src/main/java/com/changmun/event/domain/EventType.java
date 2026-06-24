package com.changmun.event.domain;

/** 행동 로그 이벤트 화이트리스트 — api-spec.md §4. 이 목록 밖 값은 거부(400). */
public enum EventType {
  LIST_VIEW("list_view"),
  DETAIL_VIEW("detail_view"),
  OUTBOUND_CLICK("outbound_click"),
  BOOKMARK_ADD("bookmark_add"),
  BOOKMARK_REMOVE("bookmark_remove"),
  SEARCH("search");

  private final String wireName;

  EventType(String wireName) {
    this.wireName = wireName;
  }

  public static boolean isAllowed(String wireName) {
    for (EventType type : values()) {
      if (type.wireName.equals(wireName)) {
        return true;
      }
    }
    return false;
  }
}
