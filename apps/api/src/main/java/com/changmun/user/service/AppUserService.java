package com.changmun.user.service;

import com.changmun.user.domain.AppUser;
import com.changmun.user.repository.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 로그인 시 (provider, provider_uid) 기준으로 사용자를 upsert한다 — 있으면 이메일 갱신, 없으면 생성. */
@Service
public class AppUserService {

  private final AppUserRepository repository;

  public AppUserService(AppUserRepository repository) {
    this.repository = repository;
  }

  @Transactional
  public AppUser upsert(String provider, String providerUid, String email) {
    return repository
        .findByProviderAndProviderUid(provider, providerUid)
        .map(existing -> refreshEmail(existing, email))
        .orElseGet(() -> repository.save(AppUser.of(provider, providerUid, email)));
  }

  private static AppUser refreshEmail(AppUser user, String email) {
    user.updateEmail(email);
    return user;
  }
}
