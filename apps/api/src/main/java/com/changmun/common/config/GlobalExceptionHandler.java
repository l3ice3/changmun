package com.changmun.common.config;

import com.changmun.common.web.InvalidParameterException;
import com.changmun.common.web.NotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.validation.BindException;
import org.springframework.validation.FieldError;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/**
 * 전역 에러 변환 — RFC7807 ProblemDetail + 확장 필드 code (api-spec.md §0). 에러 JSON을 직접 조립하지 않고 여기 한 곳에서만
 * 만든다. code: INVALID_PARAM(400) / NOT_FOUND(404) / INTERNAL(500).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

  private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
  private static final String INVALID_PARAM = "INVALID_PARAM";

  @ExceptionHandler(InvalidParameterException.class)
  public ProblemDetail handleInvalidParameter(InvalidParameterException exception) {
    return problem(HttpStatus.BAD_REQUEST, INVALID_PARAM, exception.getMessage());
  }

  @ExceptionHandler(BindException.class)
  public ProblemDetail handleBind(BindException exception) {
    return problem(HttpStatus.BAD_REQUEST, INVALID_PARAM, firstError(exception));
  }

  @ExceptionHandler(MethodArgumentTypeMismatchException.class)
  public ProblemDetail handleTypeMismatch(MethodArgumentTypeMismatchException exception) {
    log.debug("파라미터 형식 오류. name={}", exception.getName());
    return problem(HttpStatus.BAD_REQUEST, INVALID_PARAM, "파라미터 형식이 올바르지 않습니다");
  }

  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ProblemDetail handleUnreadableBody(HttpMessageNotReadableException exception) {
    log.debug("요청 본문 파싱 실패", exception);
    return problem(HttpStatus.BAD_REQUEST, INVALID_PARAM, "요청 본문을 읽을 수 없습니다");
  }

  @ExceptionHandler(NotFoundException.class)
  public ProblemDetail handleNotFound(NotFoundException exception) {
    return problem(HttpStatus.NOT_FOUND, "NOT_FOUND", exception.getMessage());
  }

  // 그 외 미처리 예외 → 500 INTERNAL(code 보존). 단 프레임워크 ErrorResponse(404·405 등)는 상태를 그대로 둔다.
  @ExceptionHandler(Exception.class)
  public ProblemDetail handleUnexpected(Exception exception) {
    if (exception instanceof ErrorResponse errorResponse) {
      return errorResponse.getBody();
    }
    log.error("처리되지 않은 예외", exception);
    return problem(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL", "서버 오류가 발생했습니다");
  }

  private static String firstError(BindException exception) {
    FieldError fieldError = exception.getFieldError();
    if (fieldError == null) {
      return "요청 파라미터가 올바르지 않습니다";
    }
    return fieldError.getDefaultMessage();
  }

  private static ProblemDetail problem(HttpStatus status, String code, String detail) {
    ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
    problem.setProperty("code", code);
    return problem;
  }
}
