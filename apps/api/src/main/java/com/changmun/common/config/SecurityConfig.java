package com.changmun.common.config;

import com.changmun.user.service.CustomOAuth2UserService;
import com.changmun.user.service.OAuth2LoginSuccessHandler;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AuthorizeHttpRequestsConfigurer;
import org.springframework.security.config.annotation.web.configurers.LogoutConfigurer;
import org.springframework.security.config.annotation.web.configurers.oauth2.client.OAuth2LoginConfigurer;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.client.web.OAuth2AuthorizedClientRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * 시큐리티 — 서빙 API는 공개(permitAll), 서버측 찜(/api/v1/bookmarks/**)만 인증 필요. OAuth2 로그인은 선택 기능.
 *
 * <p>세션 기반(HttpOnly + SameSite=Lax 쿠키). CSRF는 비활성 — SameSite=Lax로 크로스사이트 요청에 쿠키가 안 실려 인증 쓰기(찜)의
 * CSRF 기본 방어가 된다. 미인증 API 요청은 리다이렉트가 아니라 401.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  private static final String LOGOUT_URL = "/api/v1/auth/logout";

  private final CustomOAuth2UserService oauth2UserService;
  private final OAuth2LoginSuccessHandler successHandler;

  public SecurityConfig(
      CustomOAuth2UserService oauth2UserService, OAuth2LoginSuccessHandler successHandler) {
    this.oauth2UserService = oauth2UserService;
    this.successHandler = successHandler;
  }

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http, CorsConfigurationSource corsConfigurationSource) throws Exception {
    http.csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(corsConfigurationSource))
        .authorizeHttpRequests(this::authorize)
        .exceptionHandling(
            handling -> handling.authenticationEntryPoint(SecurityConfig::unauthorized))
        .oauth2Login(this::configureLogin)
        .logout(this::configureLogout);
    return http.build();
  }

  private void authorize(
      AuthorizeHttpRequestsConfigurer<HttpSecurity>.AuthorizationManagerRequestMatcherRegistry
          registry) {
    registry
        // 쇼케이스 — 내 등록물은 GET이어도 인증, 그 외 GET(리스트·상세·이미지·주간)은 공개,
        // 쓰기(등록·수정·삭제·응원·댓글)는 인증(api-spec §6).
        .requestMatchers("/api/v1/showcase/mine", "/api/v1/showcase/mine/**")
        .authenticated()
        .requestMatchers(HttpMethod.GET, "/api/v1/showcase/**")
        .permitAll()
        .requestMatchers("/api/v1/showcase/**")
        .authenticated()
        .requestMatchers("/api/v1/bookmarks/**", "/api/v1/users/me/**")
        .authenticated()
        .anyRequest()
        .permitAll();
  }

  private void configureLogin(OAuth2LoginConfigurer<HttpSecurity> oauth) {
    oauth
        .userInfoEndpoint(info -> info.userService(oauth2UserService))
        .successHandler(successHandler);
  }

  private void configureLogout(LogoutConfigurer<HttpSecurity> logout) {
    logout.logoutUrl(LOGOUT_URL).logoutSuccessHandler(SecurityConfig::logoutOk);
  }

  private static void unauthorized(
      HttpServletRequest request, HttpServletResponse response, AuthenticationException ex)
      throws IOException {
    response.sendError(HttpServletResponse.SC_UNAUTHORIZED);
  }

  private static void logoutOk(
      HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
    response.setStatus(HttpServletResponse.SC_OK);
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource(
      @Value("${changmun.web.allowed-origins}") String allowedOrigins) {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
    config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }

  /** 액세스 토큰을 세션에 보관하지 않는다(토큰 미저장 — data-model §8). */
  @Bean
  public OAuth2AuthorizedClientRepository authorizedClientRepository() {
    return new NoOpOAuth2AuthorizedClientRepository();
  }
}
