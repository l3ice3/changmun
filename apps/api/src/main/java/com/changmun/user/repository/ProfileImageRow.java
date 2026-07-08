package com.changmun.user.repository;

/**
 * 프로필 이미지 네이티브 조회 프로젝션. 이미지 바이너리는 AppUser 엔티티에 매핑하지 않는다 — 로그인 upsert·조회 경로가 최대 1MB 바이너리를 매번 싣지 않게
 * 분리(성능). 스키마 컬럼은 마이그레이션 V20260708_1000 참조.
 */
public interface ProfileImageRow {

  byte[] getImage();

  String getContentType();
}
