package com.example.duty.exception;

import org.springframework.http.HttpStatus;

/** Mã lỗi nghiệp vụ chuẩn hoá — frontend hiển thị message kèm theo. */
public enum ErrorCode {

  VALIDATION_ERROR(HttpStatus.BAD_REQUEST),
  INVALID_DATE(HttpStatus.BAD_REQUEST),
  INVALID_REQUIRED_PEOPLE(HttpStatus.BAD_REQUEST),

  SCHEDULE_NOT_FOUND(HttpStatus.NOT_FOUND),
  ASSIGNMENT_NOT_FOUND(HttpStatus.NOT_FOUND),
  NOT_FOUND(HttpStatus.NOT_FOUND),

  DUTY_SCHEDULE_CONFLICT(HttpStatus.CONFLICT),
  SCHEDULE_LOCKED(HttpStatus.CONFLICT),
  SCHEDULE_CANCELLED(HttpStatus.CONFLICT),
  INVALID_TRANSITION(HttpStatus.CONFLICT),
  ASSIGNMENT_CONFLICT(HttpStatus.CONFLICT),
  ASSIGNMENT_DUPLICATE(HttpStatus.CONFLICT),
  EMPLOYEE_ON_DAY_OFF(HttpStatus.CONFLICT),
  EMPLOYEE_NOT_FOUND(HttpStatus.BAD_REQUEST),
  DAY_OFF_DUPLICATE(HttpStatus.CONFLICT),
  ZALO_NOT_CONNECTED(HttpStatus.CONFLICT),

  FORBIDDEN(HttpStatus.FORBIDDEN),
  UNAUTHORIZED(HttpStatus.UNAUTHORIZED),

  ZALO_API_ERROR(HttpStatus.BAD_GATEWAY),
  INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR);

  private final HttpStatus httpStatus;

  ErrorCode(HttpStatus httpStatus) {
    this.httpStatus = httpStatus;
  }

  public HttpStatus httpStatus() {
    return httpStatus;
  }
}
