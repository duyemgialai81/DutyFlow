package com.example.duty.exception;

import lombok.Getter;

/** Exception nghiệp vụ — bị GlobalExceptionHandler chuyển thành ApiResponse chuẩn. */
@Getter
public class ApiException extends RuntimeException {

  private final ErrorCode errorCode;

  public ApiException(ErrorCode errorCode, String message) {
    super(message);
    this.errorCode = errorCode;
  }

  public static ApiException of(ErrorCode code, String message) {
    return new ApiException(code, message);
  }
}
