package com.changmun.common.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** 기준 시각(한국 날짜)·CORS 설정. status/dDay 산식의 "오늘"은 Asia/Seoul 기준이다. */
@Configuration
public class WebConfig implements WebMvcConfigurer {

  private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

  private final String allowedOrigins;

  public WebConfig(
      @Value("${changmun.web.allowed-origins:http://localhost:3000}") String allowedOrigins) {
    this.allowedOrigins = allowedOrigins;
  }

  @Bean
  public Clock clock() {
    return Clock.system(SEOUL);
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    CorsRegistration registration = registry.addMapping("/api/**");
    registration.allowedOrigins(allowedOrigins.split(","));
    registration.allowedMethods("GET", "POST");
    registration.allowedHeaders("*");
  }
}
