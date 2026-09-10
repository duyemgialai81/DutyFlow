package com.example.duty.exception;

import com.example.duty.dto.ApiResponse;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.List;
import java.util.NoSuchElementException;
import java.util.stream.Collectors;

/**
 * Bộ xử lý ngoại lệ tập trung chuẩn doanh nghiệp (Centralized Enterprise Exception Handler).
 * Tự động ánh xạ ngoại lệ thành ApiResponse chuẩn hóa, ghi log có cấu trúc và đính kèm traceId.
 */
@Slf4j
@RestControllerAdvice(basePackages = "com.example.duty")
public class GlobalExceptionHandler {

  /** 1. Xử lý ngoại lệ nghiệp vụ có kiểm soát */
  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ApiResponse<Void>> handleApi(ApiException ex) {
    ErrorCode ec = ex.getErrorCode();
    String code = ec.customCode() != null ? ec.customCode() : ec.name();
    String message = ex.getMessage() != null && !ex.getMessage().isBlank() ? ex.getMessage() : ec.defaultMessage();

    log.warn("[{}] Nghiệp vụ cảnh báo: {} - {}", currentTraceId(), code, message);
    return ResponseEntity
        .status(ec.httpStatus())
        .body(ApiResponse.error(code, message));
  }

  /** 2. Xử lý lỗi Validate Form DTO (@Valid, @NotBlank, @Min,...) */
  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
    List<ApiResponse.FieldErrorDetail> fieldErrors = ex.getBindingResult().getFieldErrors().stream()
        .map(fe -> new ApiResponse.FieldErrorDetail(
            fe.getField(),
            fe.getRejectedValue(),
            friendly(fe)
        ))
        .collect(Collectors.toList());

    String summary = fieldErrors.stream()
        .map(fe -> fe.field() + ": " + fe.message())
        .collect(Collectors.joining("; "));

    log.warn("[{}] Dữ liệu form không hợp lệ: {}", currentTraceId(), summary);
    return ResponseEntity
        .badRequest()
        .body(ApiResponse.error(
            ErrorCode.VALIDATION_ERROR.customCode(),
            "Dữ liệu gửi lên không hợp lệ: " + summary,
            fieldErrors
        ));
  }

  /** 3. Xử lý lỗi ràng buộc tham số (ConstraintViolationException) */
  @ExceptionHandler(ConstraintViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleConstraint(ConstraintViolationException ex) {
    List<ApiResponse.FieldErrorDetail> errors = ex.getConstraintViolations().stream()
        .map(cv -> new ApiResponse.FieldErrorDetail(
            cv.getPropertyPath().toString(),
            cv.getInvalidValue(),
            cv.getMessage()
        ))
        .collect(Collectors.toList());

    log.warn("[{}] Vi phạm ràng buộc tham số: {}", currentTraceId(), ex.getMessage());
    return ResponseEntity
        .badRequest()
        .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR.customCode(), "Tham số không hợp lệ.", errors));
  }

  /** 4. Xử lý lỗi JSON gửi lên bị sai định dạng cú pháp */
  @ExceptionHandler(HttpMessageNotReadableException.class)
  public ResponseEntity<ApiResponse<Void>> handleMalformedJson(HttpMessageNotReadableException ex) {
    log.warn("[{}] Cấu trúc JSON sai định dạng: {}", currentTraceId(), ex.getMessage());
    return ResponseEntity
        .badRequest()
        .body(ApiResponse.error(ErrorCode.MALFORMED_JSON.customCode(), "Cấu trúc dữ liệu JSON gửi lên sai định dạng cú pháp."));
  }

  /** 5. Xử lý phương thức HTTP không hỗ trợ (GET vs POST,...) */
  @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
  public ResponseEntity<ApiResponse<Void>> handleMethodNotSupported(HttpRequestMethodNotSupportedException ex) {
    log.warn("[{}] Phương thức không hỗ trợ: {}", currentTraceId(), ex.getMethod());
    return ResponseEntity
        .status(405)
        .body(ApiResponse.error(ErrorCode.METHOD_NOT_SUPPORTED.customCode(), "Phương thức " + ex.getMethod() + " không được hỗ trợ trên endpoint này."));
  }

  /** 6. Xử lý phân quyền 403 Forbidden theo cấp bậc */
  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiResponse<Void>> handleAccessDenied(AccessDeniedException ex) {
    boolean isDeptError = ex.getMessage() != null && ex.getMessage().toLowerCase().contains("khoa");
    ErrorCode ec = isDeptError ? ErrorCode.DEPT_ACCESS_DENIED : ErrorCode.FORBIDDEN;

    log.warn("[{}] Từ chối truy cập (403): {}", currentTraceId(), ex.getMessage());
    return ResponseEntity
        .status(403)
        .body(ApiResponse.error(ec.customCode(), ec.defaultMessage()));
  }

  /** 7. Xử lý lỗi xác thực tài khoản/mật khẩu (401 Unauthorized) */
  @ExceptionHandler({AuthenticationException.class, BadCredentialsException.class})
  public ResponseEntity<ApiResponse<Void>> handleAuth(Exception ex) {
    log.warn("[{}] Xác thực thất bại (401): {}", currentTraceId(), ex.getMessage());
    return ResponseEntity
        .status(401)
        .body(ApiResponse.error(ErrorCode.BAD_CREDENTIALS.customCode(), "Tài khoản hoặc mật khẩu không chính xác."));
  }

  /** 8. Xử lý không tìm thấy dữ liệu (404 Not Found) */
  @ExceptionHandler(NoSuchElementException.class)
  public ResponseEntity<ApiResponse<Void>> handleNotFound(NoSuchElementException ex) {
    log.warn("[{}] Không tìm thấy tài nguyên: {}", currentTraceId(), ex.getMessage());
    return ResponseEntity
        .status(404)
        .body(ApiResponse.error(ErrorCode.NOT_FOUND.customCode(), "Không tìm thấy dữ liệu yêu cầu."));
  }

  /** 9. Xử lý xung đột ràng buộc dữ liệu cơ sở dữ liệu (Unique / Foreign key) */
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiResponse<Void>> handleDataIntegrity(DataIntegrityViolationException ex) {
    log.error("[{}] Xung đột dữ liệu cơ sở dữ liệu (Data Integrity): {}", currentTraceId(), ex.getMessage());
    return ResponseEntity
        .status(409)
        .body(ApiResponse.error(ErrorCode.DUTY_SCHEDULE_CONFLICT.customCode(), "Dữ liệu bị xung đột hoặc đã tồn tại trong hệ thống."));
  }

  /** 10. Xử lý ngoại lệ tham số chung */
  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
    log.warn("[{}] Tham số không hợp lệ: {}", currentTraceId(), ex.getMessage());
    return ResponseEntity
        .badRequest()
        .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR.customCode(), ex.getMessage()));
  }

  /** 11. Bắt trọn vẹn lỗi hệ thống chưa xác định (500 Internal Server Error) */
  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception ex) {
    String traceId = currentTraceId();
    log.error("[{}] Lỗi hệ thống nghiêm trọng (Unhandled Exception): {}", traceId, ex.getMessage(), ex);

    String userFriendlyMessage = "Hệ thống gặp sự cố trong quá trình xử lý. Vui lòng thử lại hoặc gửi mã lỗi [" 
        + traceId + "] cho quản trị viên.";

    return ResponseEntity
        .status(500)
        .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR.customCode(), userFriendlyMessage));
  }

  private String currentTraceId() {
    try {
      String id = MDC.get("traceId");
      return (id != null && !id.isBlank()) ? id : "N/A";
    } catch (Throwable ignored) {
      return "N/A";
    }
  }

  private String friendly(org.springframework.validation.FieldError fe) {
    return fe.getDefaultMessage() != null ? fe.getDefaultMessage() : fe.getField() + " không hợp lệ";
  }
}
