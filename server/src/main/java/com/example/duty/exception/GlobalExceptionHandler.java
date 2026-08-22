package com.example.duty.exception;

import com.example.duty.dto.ApiResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice(basePackages = "com.example.duty")
public class GlobalExceptionHandler {

  @ExceptionHandler(ApiException.class)
  public ResponseEntity<ApiResponse<Void>> handleApi(ApiException ex) {
    return ResponseEntity
        .status(ex.getErrorCode().httpStatus())
        .body(ApiResponse.error(ex.getErrorCode().name(), ex.getMessage()));
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
    String message = ex.getBindingResult().getFieldErrors().stream()
        .map(this::friendly)
        .collect(Collectors.joining("; "));
    return ResponseEntity
        .badRequest()
        .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR.name(), message));
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
    return ResponseEntity
        .badRequest()
        .body(ApiResponse.error(ErrorCode.VALIDATION_ERROR.name(), ex.getMessage()));
  }

  @ExceptionHandler(AccessDeniedException.class)
  public ResponseEntity<ApiResponse<Void>> handleDenied(AccessDeniedException ex) {
    return ResponseEntity
        .status(403)
        .body(ApiResponse.error(ErrorCode.FORBIDDEN.name(), "Bạn không có quyền thực hiện thao tác này."));
  }

  @ExceptionHandler(Exception.class)
  public ResponseEntity<ApiResponse<Void>> handleUnknown(Exception ex) {
    log.error("Unhandled exception", ex);
    return ResponseEntity
        .status(500)
        .body(ApiResponse.error(ErrorCode.INTERNAL_ERROR.name(), "Lỗi hệ thống, vui lòng thử lại."));
  }

  private String friendly(FieldError fe) {
    return fe.getDefaultMessage() != null ? fe.getDefaultMessage() : fe.getField() + " không hợp lệ";
  }
}
