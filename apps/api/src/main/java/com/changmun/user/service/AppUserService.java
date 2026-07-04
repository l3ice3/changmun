package com.changmun.user.service;

import com.changmun.user.domain.AppUser;
import com.changmun.user.repository.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 로그인 시 (provider, provider_uid) 기준으로 사용자를 원자적 upsert하고 최신 상태를 돌려준다. */
@Service
public class AppUserService {

  private final AppUserRepository repository;

  public AppUserService(AppUserRepository repository) {
    this.repository = repository;
  }

  @Transactional
  public AppUser upsert(String provider, String providerUid, String email) {
    repository.upsert(email, provider, providerUid);
    return repository
        .findByProviderAndProviderUid(provider, providerUid)
        .orElseThrow(() -> new IllegalStateException("upsert 직후 사용자를 찾지 못함: " + provider));
  }
}
