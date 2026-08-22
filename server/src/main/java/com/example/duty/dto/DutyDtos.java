package com.example.duty.dto;

import com.example.duty.entity.DutyAssignment;
import com.example.duty.entity.DutySchedule;
import jakarta.validation.constraints.FutureOrPresent;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/** Request/Response DTO cho Schedule + Assignment + Calendar. */
public final class DutyDtos {

  private DutyDtos() {}

  /* ================= Schedule ================= */

  public record CreateScheduleRequest(
      @NotNull(message = "Ngày trực không được để trống")
      @FutureOrPresent(message = "Không được chọn ngày trong quá khứ")
      LocalDate date,

      @NotNull(message = "Ca trực không được để trống")
      Long shiftId,

      @NotNull @Min(value = 1, message = "Số người cần phải lớn hơn 0") @Max(8)
      Integer requiredPeople,

      @NotBlank(message = "Địa điểm không được để trống")
      String location,

      Long departmentId,

      DutySchedule.Status status // null → DRAFT
  ) {}

  public record UpdateScheduleRequest(
      @FutureOrPresent(message = "Không được chuyển về ngày trong quá khứ") LocalDate date,
      Long shiftId,
      @Min(1) @Max(8) Integer requiredPeople,
      String location,
      Long departmentId
  ) {}

  public record AssignmentResponse(
      Long id,
      Long scheduleId,
      Long employeeId,
      String employeeName,
      String employeeCode,
      String departmentName,
      boolean zaloConnected,
      DutyAssignment.Status status,
      Instant assignedAt,
      Instant confirmedAt
  ) {}

  public record ScheduleResponse(
      Long id,
      LocalDate date,
      Long shiftId,
      String shiftName,
      String shiftCode,
      LocalTime startTime,
      LocalTime endTime,
      int requiredPeople,
      String location,
      Long departmentId,
      String departmentName,
      DutySchedule.Status status,
      String createdBy,
      Instant createdAt,
      List<AssignmentResponse> assignments
  ) {}

  public record HistoryResponse(
      Long id, String action, String oldValue, String newValue, String changedBy, Instant createdAt
  ) {}

  public record ScheduleDetailResponse(
      ScheduleResponse schedule,
      List<HistoryResponse> history
  ) {}

  public record CalendarStats(
      long totalSchedules, long understaffed, long locked, long confirmedAssignments, long totalAssignments
  ) {}

  public record CalendarResponse(
      List<ScheduleResponse> schedules,
      CalendarStats stats
  ) {}

  /* ================= Assignment ================= */

  public record AssignEmployeeRequest(
      @NotNull(message = "Thiếu employeeId") Long employeeId
  ) {}

  public record MyDutyItem(
      Long assignmentId,
      DutyAssignment.Status assignmentStatus,
      ScheduleResponse schedule
  ) {}
}
