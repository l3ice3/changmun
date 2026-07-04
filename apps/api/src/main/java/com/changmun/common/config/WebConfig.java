package com.changmun.common.config;

import java.time.Clock;
import java.time.ZoneId;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 기준 시각(한국 날짜) 빈. status/dDay 산식의 "오늘"은 Asia/Seoul 기준이다. (CORS는 SecurityConfig의
 * CorsConfigurationSource로 통일)
 */
@Configuration
public class WebConfig {

  private static final ZoneId SEOUL = ZoneId.of("Asia/Seoul");

  @Bean
  public Clock clock() {
    return Clock.system(SEOUL);
  }
}
