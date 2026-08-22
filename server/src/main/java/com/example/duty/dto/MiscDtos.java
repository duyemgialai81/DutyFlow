package com.example.duty.dto;

import com.example.duty.entity.AppNotification;
import com.example.duty.entity.DayOff;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** DTO cho DayOff, Zalo integration, Notification. */
public final class MiscDtos {

  private MiscDtos() {}

  /* ---------- DayOff ---------- */
  public record DayOffRequest(
      @NotNull @FutureOrPresent(message = "Không đăng ký nghỉ cho ngày quá khứ") LocalDate date,
      @NotBlank(message = "Lý do không được để trống") String reason,
      Long employeeId // chỉ ADMIN dùng để đăng ký hộ
  ) {}

  public record DayOffResponse(
      Long id, Long employeeId, String employeeName, LocalDate date, String reason, DayOff.Status status
  ) {}

  public record DayOffStatusRequest(@NotNull DayOff.Status status) {}

  /* ---------- Zalo ---------- */
  public record ZaloConnectResponse(String authorizationUrl, String state) {}

  public record ZaloStatusResponse(
      boolean connected,
      String zaloUserId, // đã mask — KHÔNG trả token
      Instant connectedAt,
      boolean receiveNotifications,
      Long employeeId
  ) {}

  public record ZaloEmployeeRow(
      Long employeeId, String employeeName, String employeeCode,
      boolean connected, String zaloUserId, Instant connectedAt, boolean receiveNotifications
  ) {}

  public record ZaloPreferenceRequest(boolean receiveNotifications) {}

  /** Payload webhook Zalo gửi về (tuỳ sự kiện) */
  public record ZaloWebhookPayload(String app_id, String event_name, String message, String timestamp, String mac) {}

  /* ---------- Notification ---------- */
  public record NotificationResponse(
      Long id, Long employeeId, String employeeName, AppNotification.Type type,
      String title, String content, AppNotification.Channel channel, AppNotification.Status status,
      String externalMessageId, int retryCount, String lastError, boolean read, Instant createdAt, Instant sentAt
  ) {}

  public record UnreadCountResponse(long count) {}

  /* ---------- Danh mục ---------- */
  public record ShiftResponse(Long id, String code, String name, String startTime, String endTime, String description) {}

  public record DepartmentResponse(Long id, String name) {}

  public record EmployeeResponse(
      Long id, String employeeCode, String fullName, String email, String phone,
      Long departmentId, String departmentName, long shiftCountMonth, boolean zaloConnected
  ) {}
}
