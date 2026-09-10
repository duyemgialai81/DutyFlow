package com.example.duty.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import org.slf4j.MDC;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Phong bì phản hồi chuẩn hoá cấp doanh nghiệp (Enterprise Standard Response Envelope):
 * {
 *   "success": true/false,
 *   "code": "20000_SUCCESS" / "40001_VALIDATION_ERROR",
 *   "message": "...",
 *   "data": ...,
 *   "traceId": "uuid-truy-vet-request",
 *   "errors": [ { "field": "...", "rejectedValue": ..., "message": "..." } ],
 *   "timestamp": "2026-09-10T10:30:00"
 * }
 */
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiResponse<T>(
    boolean success,
    String code,
    String message,
    T data,
    String traceId,
    List<FieldErrorDetail> errors,
    LocalDateTime timestamp
) {

  public record FieldErrorDetail(
      String field,
      Object rejectedValue,
      String message
  ) {}

  /** Constructor tương thích ngược cho các đoạn mã cũ */
  public ApiResponse(boolean success, String code, String message, LocalDateTime timestamp, T data) {
    this(success, code, message, data, currentTraceId(), null, timestamp != null ? timestamp : LocalDateTime.now());
  }

  private static String currentTraceId() {
    try {
      String id = MDC.get("traceId");
      return (id != null && !id.isBlank()) ? id : null;
    } catch (Throwable ignored) {
      return null;
    }
  }

  public static <T> ApiResponse<T> ok(T data) {
    return new ApiResponse<>(true, "20000_SUCCESS", "Thành công", data, currentTraceId(), null, LocalDateTime.now());
  }

  public static <T> ApiResponse<T> ok(String message, T data) {
    return new ApiResponse<>(true, "20000_SUCCESS", message, data, currentTraceId(), null, LocalDateTime.now());
  }

  public static <T> ApiResponse<T> of(String code, String message, T data) {
    return new ApiResponse<>(true, code, message, data, currentTraceId(), null, LocalDateTime.now());
  }

  public static ApiResponse<Void> error(String code, String message) {
    return new ApiResponse<>(false, code, message, null, currentTraceId(), null, LocalDateTime.now());
  }

  public static ApiResponse<Void> error(String code, String message, List<FieldErrorDetail> errors) {
    return new ApiResponse<>(false, code, message, null, currentTraceId(), errors, LocalDateTime.now());
  }
}
