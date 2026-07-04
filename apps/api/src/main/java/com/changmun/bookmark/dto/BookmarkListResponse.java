package com.changmun.bookmark.dto;

import java.util.List;

/** 서버측 찜 목록 — 찜한 공고 id(최근 순). 카드 렌더는 프론트가 GET /opportunities?ids= 로 이어서 조회. */
public record BookmarkListResponse(List<Long> opportunityIds) {}
