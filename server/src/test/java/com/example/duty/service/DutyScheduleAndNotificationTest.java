package com.example.duty.service;

import com.example.duty.dto.DutyDtos;
import com.example.duty.entity.*;
import com.example.duty.exception.ApiException;
import com.example.duty.exception.ErrorCode;
import com.example.duty.mapper.DutyMapper;
import com.example.duty.notification.NotificationService;
import com.example.duty.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class DutyScheduleAndNotificationTest {

  private final DutyScheduleRepository scheduleRepository = mock(DutyScheduleRepository.class);
  private final DutyAssignmentRepository assignmentRepository = mock(DutyAssignmentRepository.class);
  private final ScheduleHistoryRepository historyRepository = mock(ScheduleHistoryRepository.class);
  private final ShiftRepository shiftRepository = mock(ShiftRepository.class);
  private final DepartmentRepository departmentRepository = mock(DepartmentRepository.class);
  private final AppNotificationRepository notificationRepository = mock(AppNotificationRepository.class);
  private final EmployeeRepository employeeRepository = mock(EmployeeRepository.class);
  private final ZaloMappingRepository zaloMappingRepository = mock(ZaloMappingRepository.class);
  private final DutyMapper mapper = mock(DutyMapper.class);

  private ScheduleAlgorithmService algorithm() {
    return new ScheduleAlgorithmService(employeeRepository, shiftRepository,
        scheduleRepository, assignmentRepository, mock(DayOffRepository.class));
  }

  private DutyScheduleService scheduleService() {
    return new DutyScheduleService(scheduleRepository, assignmentRepository, historyRepository,
        shiftRepository, departmentRepository, algorithm(), mapper, mock(org.springframework.context.ApplicationEventPublisher.class));
  }

  private Shift shift() {
    Shift s = new Shift();
    s.setId(1L);
    s.setCode("MORNING");
    s.setName("Ca sáng");
    s.setStartTime(LocalTime.of(8, 0));
    s.setEndTime(LocalTime.of(12, 0));
    return s;
  }

  @Test
  @DisplayName("Tạo lịch trùng ngày+ca → DUTY_SCHEDULE_CONFLICT (409)")
  void duplicateScheduleRejected() {
    DutyScheduleService service = scheduleService();
    DutySchedule dup = new DutySchedule();
    dup.setId(5L);
    dup.setShift(shift());
    when(scheduleRepository.findByDateAndShiftIdAndStatusNot(any(), anyLong(), any()))
        .thenReturn(Optional.of(dup));

    assertThatThrownBy(() -> service.assertNoDuplicate(LocalDate.of(2026, 8, 25), 1L, null))
        .isInstanceOf(ApiException.class)
        .satisfies(ex -> assertThat(((ApiException) ex).getErrorCode())
            .isEqualTo(ErrorCode.DUTY_SCHEDULE_CONFLICT));
  }

  @Test
  @DisplayName("NotificationService: trùng idempotency key → KHÔNG tạo bản ghi mới")
  void idempotentNotification() {
    NotificationService service = new NotificationService(notificationRepository, employeeRepository,
        zaloMappingRepository, List.of(), mapper, 3, 10, 2);

    AppNotification existing = new AppNotification();
    when(notificationRepository.findByIdempotencyKey("emp1:SCHEDULE_ASSIGNED:7:x"))
        .thenReturn(Optional.of(existing));

    service.publish(1L, AppNotification.Type.SCHEDULE_ASSIGNED, LocalDate.now(),
        LocalTime.of(8, 0), LocalTime.of(12, 0), "Văn phòng A", "emp1:SCHEDULE_ASSIGNED:7:x");

    verify(notificationRepository, never()).save(any());
  }

  @Test
  @DisplayName("NotificationService: retry tối đa 3 lần rồi FAILED")
  void retryThenFail() {
    // Mô phỏng vòng retry qua handleFailure thông qua deliver() với channel lỗi
    var failingChannel = new com.example.duty.notification.NotificationChannel() {
      @Override public String channelName() { return "zalo"; }
      @Override public DeliveryResult send(String r, String t, String c) throws NotificationDeliveryException {
        throw new NotificationDeliveryException("Zalo API error 503");
      }
    };
    NotificationService service = new NotificationService(notificationRepository, employeeRepository,
        zaloMappingRepository, List.of(failingChannel), mapper, 3, 1, 1);

    Employee emp = new Employee();
    emp.setId(1L);
    AppNotification n = new AppNotification();
    n.setId(10L);
    n.setEmployee(emp);
    n.setChannel(AppNotification.Channel.ZALO);

    ZaloMapping mapping = new ZaloMapping();
    mapping.setStatus(ZaloMapping.Status.CONNECTED);
    mapping.setReceiveNotifications(true);
    mapping.setZaloUserId("820001");

    when(notificationRepository.findById(10L)).thenReturn(Optional.of(n));
    when(employeeRepository.findById(1L)).thenReturn(Optional.of(emp));
    when(zaloMappingRepository.findByEmployeeId(1L)).thenReturn(Optional.of(mapping));
    when(notificationRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

    // Chạy deliver 4 lần liên tiếp (1 gốc + 3 retry) để kiểm tra trạng thái cuối
    for (int i = 0; i < 4; i++) service.deliver(10L);

    assertThat(n.getRetryCount()).isEqualTo(3);
    assertThat(n.getStatus()).isEqualTo(AppNotification.Status.FAILED);
    assertThat(n.getLastError()).contains("503");
  }
}
