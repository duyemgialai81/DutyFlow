package com.example.duty.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.time.LocalDateTime;

/**
 * Phong bì phản hồi chuẩn hoá của module:
 * { "success": true/false, "code": "...", "message": "...", "timestamp": "...", "data": ... }
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
    boolean success,
    String code,
    String message,
    LocalDateTime timestamp,
    T data
) {

  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(true, "OK", null, LocalDateTime.now(), data);
  }

  public static <T> ApiResponse<T> ok(String message, T data) {
    return new ApiResponse<>(true, "OK", message, LocalDateTime.now(), data);
  }

  public static ApiResponse<Void> error(String code, String message) {
    return new ApiResponse<>(false, code, message, LocalDateTime.now(), null);
  }
}
