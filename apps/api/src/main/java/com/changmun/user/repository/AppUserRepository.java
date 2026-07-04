package com.changmun.user.repository;

import com.changmun.user.domain.AppUser;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** 로그인 사용자 저장/조회 — 로그인 시 (provider, provider_uid)로 upsert 판별. */
public interface AppUserRepository extends JpaRepository<AppUser, Long> {

  Optional<AppUser> findByProviderAndProviderUid(String provider, String providerUid);
}
