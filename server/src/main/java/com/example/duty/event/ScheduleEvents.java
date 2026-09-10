package com.example.duty.event;

import com.example.duty.entity.DutySchedule;

import java.util.List;

/**
 * Domain events của module. Service KHÔNG gọi Zalo trực tiếp trong transaction —
 * chỉ publish event; NotificationEventListener xử lý sau khi commit (AFTER_COMMIT + @Async)
 * nên Zalo lỗi không làm hỏng nghiệp vụ tạo lịch.
 */
public final class ScheduleEvents {

  private ScheduleEvents() {}
  public record ScheduleCreatedEvent(DutySchedule schedule, String actor) {}
  public record ScheduleUpdatedEvent(DutySchedule schedule, String changedFields, String actor) {}
  public record ScheduleAssignedEvent(DutySchedule schedule, List<Long> employeeIds, String actor) {}
  public record ScheduleConfirmedEvent(DutySchedule schedule, String actor) {}
  public record ScheduleCancelledEvent(DutySchedule schedule, List<Long> employeeIds, String actor) {}
}
