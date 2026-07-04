package com.changmun.common.config;

import com.changmun.user.service.CustomOAuth2UserService;
import com.changmun.user.service.OAuth2LoginSuccessHandler;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * 시큐리티 — 서빙 API는 공개(permitAll) 유지, OAuth2 로그인만 추가한다(로그인은 선택 기능이며 아직 게이트하는 엔드포인트 없음).
 *
 * <p>세션 기반(HttpOnly 쿠키). CSRF는 비활성 — 쿠키 SameSite로 방어하고, 유일한 쓰기(POST /events)는 비인증 공개다. 인증 쓰기(서버 찜)가
 * 붙는 후속 PR에서 CSRF·인가를 재검토한다.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      CustomOAuth2UserService oauth2UserService,
      OAuth2LoginSuccessHandler successHandler,
      CorsConfigurationSource corsConfigurationSource)
      throws Exception {
    http.csrf(csrf -> csrf.disable())
        .cors(cors -> cors.configurationSource(corsConfigurationSource))
        .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
        .oauth2Login(
            oauth ->
                oauth
                    .userInfoEndpoint(info -> info.userService(oauth2UserService))
                    .successHandler(successHandler))
        .logout(
            logout ->
                logout
                    .logoutUrl("/api/v1/auth/logout")
                    .logoutSuccessHandler(
                        (request, response, authentication) ->
                            response.setStatus(HttpServletResponse.SC_OK)));
    return http.build();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource(
      @Value("${changmun.web.allowed-origins}") String allowedOrigins) {
    CorsConfiguration config = new CorsConfiguration();
    config.setAllowedOrigins(List.of(allowedOrigins.split(",")));
    config.setAllowedMethods(List.of("GET", "POST"));
    config.setAllowedHeaders(List.of("*"));
    config.setAllowCredentials(true);
    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", config);
    return source;
  }
}
