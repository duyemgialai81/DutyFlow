package com.example.duty.exception;

import org.springframework.http.HttpStatus;

/**
 * Mã lỗi nghiệp vụ chuẩn hoá cấp doanh nghiệp (Enterprise Error Codes).
 */
public enum ErrorCode {

  VALIDATION_ERROR(HttpStatus.BAD_REQUEST, "40001_VALIDATION_ERROR", "Dữ liệu đầu vào không hợp lệ."),
  INVALID_DATE(HttpStatus.BAD_REQUEST, "40002_INVALID_DATE", "Ngày trực không hợp lệ."),
  INVALID_REQUIRED_PEOPLE(HttpStatus.BAD_REQUEST, "40003_INVALID_REQUIRED_PEOPLE", "Số người trực yêu cầu không hợp lệ."),
  MALFORMED_JSON(HttpStatus.BAD_REQUEST, "40004_MALFORMED_JSON", "Cấu trúc JSON gửi lên sai định dạng."),
  METHOD_NOT_SUPPORTED(HttpStatus.METHOD_NOT_ALLOWED, "40501_METHOD_NOT_ALLOWED", "Phương thức HTTP không được hỗ trợ."),

  SCHEDULE_NOT_FOUND(HttpStatus.NOT_FOUND, "40401_SCHEDULE_NOT_FOUND", "Không tìm thấy ca trực yêu cầu."),
  ASSIGNMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "40402_ASSIGNMENT_NOT_FOUND", "Không tìm thấy phân công trực."),
  EMPLOYEE_NOT_FOUND(HttpStatus.NOT_FOUND, "40403_EMPLOYEE_NOT_FOUND", "Không tìm thấy nhân viên."),
  DEPARTMENT_NOT_FOUND(HttpStatus.NOT_FOUND, "40404_DEPARTMENT_NOT_FOUND", "Không tìm thấy khoa/phòng ban."),
  NOT_FOUND(HttpStatus.NOT_FOUND, "40400_NOT_FOUND", "Không tìm thấy tài nguyên yêu cầu."),

  DUTY_SCHEDULE_CONFLICT(HttpStatus.CONFLICT, "40901_SCHEDULE_CONFLICT", "Xung đột lịch trực trùng ca hoặc trùng thời gian."),
  SCHEDULE_LOCKED(HttpStatus.CONFLICT, "40902_SCHEDULE_LOCKED", "Lịch trực đã khoá hoặc đã hoàn thành, không thể sửa đổi."),
  SCHEDULE_CANCELLED(HttpStatus.CONFLICT, "40903_SCHEDULE_CANCELLED", "Lịch trực đã bị huỷ."),
  INVALID_TRANSITION(HttpStatus.CONFLICT, "40904_INVALID_TRANSITION", "Chuyển đổi trạng thái ca trực không hợp lệ."),
  ASSIGNMENT_CONFLICT(HttpStatus.CONFLICT, "40905_ASSIGNMENT_CONFLICT", "Nhân viên đã được xếp ca trực khác trong cùng thời gian."),
  ASSIGNMENT_DUPLICATE(HttpStatus.CONFLICT, "40906_ASSIGNMENT_DUPLICATE", "Nhân viên đã có tên trong ca trực này."),
  EMPLOYEE_ON_DAY_OFF(HttpStatus.CONFLICT, "40907_EMPLOYEE_ON_DAY_OFF", "Nhân viên đã đăng ký nghỉ trong ngày này."),
  DAY_OFF_DUPLICATE(HttpStatus.CONFLICT, "40908_DAY_OFF_DUPLICATE", "Đơn xin nghỉ ngày này đã tồn tại."),
  ZALO_NOT_CONNECTED(HttpStatus.CONFLICT, "40909_ZALO_NOT_CONNECTED", "Nhân viên chưa liên kết tài khoản Zalo."),

  FORBIDDEN(HttpStatus.FORBIDDEN, "40301_FORBIDDEN", "Bạn không có quyền thực hiện thao tác này."),
  DEPT_ACCESS_DENIED(HttpStatus.FORBIDDEN, "40302_DEPT_ACCESS_DENIED", "Bạn chỉ có thẩm quyền quản trị trong phạm vi Khoa/Phòng của mình."),
  UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "40101_UNAUTHORIZED", "Phiên đăng nhập đã hết hạn hoặc chưa được xác thực."),
  BAD_CREDENTIALS(HttpStatus.UNAUTHORIZED, "40102_BAD_CREDENTIALS", "Tài khoản hoặc mật khẩu không chính xác."),

  ZALO_API_ERROR(HttpStatus.BAD_GATEWAY, "50201_ZALO_API_ERROR", "Lỗi kết nối máy chủ Zalo API."),
  INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "50000_INTERNAL_ERROR", "Lỗi hệ thống máy chủ, vui lòng liên hệ quản trị viên.");

  private final HttpStatus httpStatus;
  private final String customCode;
  private final String defaultMessage;

  ErrorCode(HttpStatus httpStatus, String customCode, String defaultMessage) {
    this.httpStatus = httpStatus;
    this.customCode = customCode;
    this.defaultMessage = defaultMessage;
  }

  ErrorCode(HttpStatus httpStatus) {
    this(httpStatus, httpStatus.value() + "_" + httpStatus.name(), httpStatus.getReasonPhrase());
  }

  public HttpStatus httpStatus() {
    return httpStatus;
  }

  public String customCode() {
    return customCode;
  }

  public String defaultMessage() {
    return defaultMessage;
  }
}
