package com.changmun;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * 서빙 API 진입점. 루트 패키지(com.changmun)에 둬서 컴포넌트 스캔과 테스트 @SpringBootConfiguration 탐색이
 * controller/service/repository/domain/config 전 계층을 덮게 한다.
 */
@SpringBootApplication
public class ApiApplication {

  public static void main(String[] args) {
    SpringApplication.run(ApiApplication.class, args);
  }
}
