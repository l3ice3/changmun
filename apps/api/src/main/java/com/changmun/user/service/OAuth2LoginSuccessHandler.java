package com.changmun.user.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

/** 로그인 성공 후 프론트엔드로 리다이렉트한다(세션 쿠키는 이미 발급됨). */
@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

  public OAuth2LoginSuccessHandler(@Value("${changmun.web.frontend-url}") String frontendUrl) {
    setDefaultTargetUrl(frontendUrl);
    setAlwaysUseDefaultTargetUrl(true);
  }
}
