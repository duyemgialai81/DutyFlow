package com.example.duty.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

/** DTO cho luồng Auto-assign preview → confirm. */
public final class AutoAssignDtos {

  private AutoAssignDtos() {}

  public record AutoAssignRequest(
      @NotNull(message = "Thiếu ngày bắt đầu") LocalDate startDate,
      @NotNull(message = "Thiếu ngày kết thúc") LocalDate endDate,
      @NotNull(message = "Thiếu ca trực") Long shiftId,
      Long departmentId,
      @NotNull @Min(1) @Max(5) Integer requiredPeople,
      @NotBlank(message = "Thiếu địa điểm") String location
  ) {
    public AutoAssignRequest {
      if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
        throw new IllegalArgumentException("Ngày kết thúc phải sau ngày bắt đầu");
      }
    }
  }

  public record PreviewEmployee(Long id, String name, long currentLoad) {}

  public record PreviewItem(
      Long scheduleId,
      boolean existing,
      LocalDate date,
      Long shiftId,
      String shiftName,
      String startTime,
      String endTime,
      String location,
      int requiredPeople,
      List<PreviewEmployee> employees
  ) {}

  public record PreviewWarning(
      Level level,
      LocalDate date,
      String message
  ) {
    public enum Level { WARN, INFO }
  }

  public record PreviewTotals(int schedules, long slots, long assigned, long missing) {}

  public record AutoAssignPreviewResponse(
      boolean success,
      List<PreviewItem> assignments,
      List<PreviewWarning> warnings,
      PreviewTotals totals
  ) {}

  public record AutoAssignConfirmResponse(
      boolean success,
      int created,
      PreviewTotals totals
  ) {}
}
