package com.changmun.common.config;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.changmun.opportunity.controller.OpportunityController;
import com.changmun.opportunity.service.OpportunityService;
import com.changmun.user.service.CustomOAuth2UserService;
import com.changmun.user.service.OAuth2LoginSuccessHandler;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

/** 전역 에러 변환 슬라이스 — 미처리 예외는 500 INTERNAL(code 보존)로 변환된다 (api-spec.md §0). */
@WebMvcTest(OpportunityController.class)
@Import(SecurityConfig.class)
class GlobalExceptionHandlerTest {

  @Autowired private MockMvc mockMvc;
  @MockitoBean private OpportunityService service;

  // 슬라이스는 SecurityFilterChain을 로드하므로 OAuth 빈(@Service/@Component)이 필요 — 목으로 채운다.
  @MockitoBean private CustomOAuth2UserService oauth2UserService;
  @MockitoBean private OAuth2LoginSuccessHandler oauth2LoginSuccessHandler;

  @Test
  @DisplayName("미처리 예외는 500 INTERNAL code로 응답된다")
  void unexpectedExceptionBecomesInternal() throws Exception {
    given(service.list(any())).willThrow(new RuntimeException("예상치 못한 오류"));

    ResultActions result = mockMvc.perform(get("/api/v1/opportunities"));

    result.andExpect(status().isInternalServerError());
    result.andExpect(jsonPath("$.code").value("INTERNAL"));
  }
}
