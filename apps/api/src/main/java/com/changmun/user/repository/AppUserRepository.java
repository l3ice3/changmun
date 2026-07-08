package com.changmun.user.repository;

import com.changmun.user.domain.AppUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 로그인 사용자 저장/조회. */
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

  Optional<AppUser> findByProviderAndProviderUid(String provider, String providerUid);

  /**
   * 원자적 upsert — (provider, provider_uid) 충돌 시 이메일만 갱신. 동시 첫 로그인 콜백의 유니크 위반 레이스를 DB가 흡수한다(SELECT 후
   * INSERT 금지 — persistence.md §5).
   */
  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      value =
          """
          INSERT INTO app_user (email, provider, provider_uid)
          VALUES (:email, :provider, :providerUid)
          ON CONFLICT (provider, provider_uid) DO UPDATE SET email = EXCLUDED.email
          """,
      nativeQuery = true)
  void upsert(
      @Param("email") String email,
      @Param("provider") String provider,
      @Param("providerUid") String providerUid);

  /** 프로필 이미지 조회 — 미설정이면 empty (컨트롤러에서 404). */
  @Query(
      value =
          """
          SELECT profile_image AS image, profile_image_type AS contentType
          FROM app_user
          WHERE id = :userId AND profile_image IS NOT NULL
          """,
      nativeQuery = true)
  Optional<ProfileImageRow> findProfileImage(@Param("userId") Long userId);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      value =
          """
          UPDATE app_user
          SET profile_image = :image, profile_image_type = :contentType
          WHERE id = :userId
          """,
      nativeQuery = true)
  int updateProfileImage(
      @Param("userId") Long userId,
      @Param("image") byte[] image,
      @Param("contentType") String contentType);

  @Modifying(clearAutomatically = true, flushAutomatically = true)
  @Query(
      value =
          """
          UPDATE app_user
          SET profile_image = NULL, profile_image_type = NULL
          WHERE id = :userId
          """,
      nativeQuery = true)
  void clearProfileImage(@Param("userId") Long userId);
}
