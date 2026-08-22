package com.example.duty.service;

import com.example.duty.dto.AutoAssignDtos.AutoAssignRequest;
import com.example.duty.entity.*;
import com.example.duty.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScheduleAlgorithmServiceTest {

  @Mock EmployeeRepository employeeRepository;
  @Mock ShiftRepository shiftRepository;
  @Mock DutyScheduleRepository scheduleRepository;
  @Mock DutyAssignmentRepository assignmentRepository;
  @Mock DayOffRepository dayOffRepository;

  ScheduleAlgorithmService service;
  Shift morning;

  @BeforeEach
  void setUp() {
    service = new ScheduleAlgorithmService(employeeRepository, shiftRepository,
        scheduleRepository, assignmentRepository, dayOffRepository);
    morning = new Shift();
    morning.setId(1L);
    morning.setCode("MORNING");
    morning.setName("Ca sáng");
    morning.setStartTime(LocalTime.of(8, 0));
    morning.setEndTime(LocalTime.of(12, 0));
  }

  private Employee emp(long id, String name) {
    Employee e = new Employee();
    e.setId(id);
    e.setFullName(name);
    e.setEmployeeCode("EMP-" + id);
    e.setStatus(Employee.Status.ACTIVE);
    return e;
  }

  @Test
  @DisplayName("Ưu tiên người có ít ca hơn: D(0) → B(1) → A(2), không chọn C(4)")
  void fairOrdering() {
    LocalDate date = LocalDate.of(2026, 8, 25);
    var req = new AutoAssignRequest(date, date, 1L, null, 2, "Văn phòng A");

    when(shiftRepository.findById(1L)).thenReturn(Optional.of(morning));
    when(scheduleRepository.findByDateAndShiftIdAndStatusNot(any(), anyLong(), any())).thenReturn(Optional.empty());
    when(employeeRepository.findAllByStatus(Employee.Status.ACTIVE))
        .thenReturn(List.of(emp(1, "A"), emp(2, "B"), emp(3, "C"), emp(4, "D")));
    when(dayOffRepository.existsByEmployeeIdAndDateAndStatusNot(anyLong(), any(), any())).thenReturn(false);
    when(assignmentRepository.findConflicting(anyLong(), any(), any(), any())).thenReturn(List.of());
    when(assignmentRepository.countByEmployeeAndMonth(eq(1L), anyString())).thenReturn(2L);
    when(assignmentRepository.countByEmployeeAndMonth(eq(2L), anyString())).thenReturn(1L);
    when(assignmentRepository.countByEmployeeAndMonth(eq(3L), anyString())).thenReturn(4L);
    when(assignmentRepository.countByEmployeeAndMonth(eq(4L), anyString())).thenReturn(0L);

    var plan = service.buildPlan(req);
    var chosen = plan.items().get(0).employees().stream().map(e -> e.name()).toList();
    assertThat(chosen).containsExactly("D", "B"); // D(0 ca) rồi B(1 ca)
    assertThat(plan.totals().missing()).isZero();
  }

  @Test
  @DisplayName("Không phân nhân viên đang nghỉ phép")
  void excludesDayOff() {
    LocalDate date = LocalDate.of(2026, 8, 25);
    var req = new AutoAssignRequest(date, date, 1L, null, 1, "Văn phòng A");

    when(shiftRepository.findById(1L)).thenReturn(Optional.of(morning));
    when(scheduleRepository.findByDateAndShiftIdAndStatusNot(any(), anyLong(), any())).thenReturn(Optional.empty());
    when(employeeRepository.findAllByStatus(Employee.Status.ACTIVE)).thenReturn(List.of(emp(3, "C")));
    when(dayOffRepository.existsByEmployeeIdAndDateAndStatusNot(eq(3L), eq(date), eq(DayOff.Status.REJECTED)))
        .thenReturn(true);

    var plan = service.buildPlan(req);
    assertThat(plan.items().get(0).employees()).isEmpty();
    assertThat(plan.warnings()).anyMatch(w -> w.level() == com.example.duty.dto.AutoAssignDtos.PreviewWarning.Level.WARN
        && w.message().contains("không đủ nhân sự"));
  }

  @Test
  @DisplayName("Không phân ca trùng khung giờ trong ngày")
  void excludesTimeConflict() {
    LocalDate date = LocalDate.of(2026, 8, 25);
    var req = new AutoAssignRequest(date, date, 1L, null, 1, "Văn phòng A");

    when(shiftRepository.findById(1L)).thenReturn(Optional.of(morning));
    when(scheduleRepository.findByDateAndShiftIdAndStatusNot(any(), anyLong(), any())).thenReturn(Optional.empty());
    when(employeeRepository.findAllByStatus(Employee.Status.ACTIVE)).thenReturn(List.of(emp(1, "A")));
    when(dayOffRepository.existsByEmployeeIdAndDateAndStatusNot(anyLong(), any(), any())).thenReturn(false);
    DutyAssignment conflict = new DutyAssignment();
    when(assignmentRepository.findConflicting(eq(1L), eq(date), any(), any())).thenReturn(List.of(conflict));

    var plan = service.buildPlan(req);
    assertThat(plan.items().get(0).employees()).isEmpty();
    assertThat(plan.warnings()).anyMatch(w -> w.message().contains("trùng giờ"));
  }

  @Test
  @DisplayName("Không ghi đè lịch đã LOCKED")
  void skipsLocked() {
    LocalDate date = LocalDate.of(2026, 8, 25);
    var req = new AutoAssignRequest(date, date, 1L, null, 2, "Văn phòng A");

    DutySchedule locked = new DutySchedule();
    locked.setId(9L);
    locked.setStatus(DutySchedule.Status.LOCKED);
    when(shiftRepository.findById(1L)).thenReturn(Optional.of(morning));
    when(scheduleRepository.findByDateAndShiftIdAndStatusNot(eq(date), eq(1L), any())).thenReturn(Optional.of(locked));

    var plan = service.buildPlan(req);
    assertThat(plan.items()).isEmpty();
    assertThat(plan.warnings()).anyMatch(w -> w.message().contains("KHÓA"));
  }

  @Test
  @DisplayName("Giới hạn 10 ca/tháng được tôn trọng")
  void respectsMonthlyLimit() {
    LocalDate date = LocalDate.of(2026, 8, 25);
    var req = new AutoAssignRequest(date, date, 1L, null, 1, "Văn phòng A");

    when(shiftRepository.findById(1L)).thenReturn(Optional.of(morning));
    when(scheduleRepository.findByDateAndShiftIdAndStatusNot(any(), anyLong(), any())).thenReturn(Optional.empty());
    when(employeeRepository.findAllByStatus(Employee.Status.ACTIVE)).thenReturn(List.of(emp(1, "A")));
    when(dayOffRepository.existsByEmployeeIdAndDateAndStatusNot(anyLong(), any(), any())).thenReturn(false);
    when(assignmentRepository.findConflicting(anyLong(), any(), any(), any())).thenReturn(List.of());
    when(assignmentRepository.countByEmployeeAndMonth(eq(1L), anyString())).thenReturn((long) ScheduleAlgorithmService.MAX_SHIFT_PER_MONTH);

    var plan = service.buildPlan(req);
    assertThat(plan.items().get(0).employees()).isEmpty();
    assertThat(plan.warnings()).anyMatch(w -> w.message().contains("giới hạn"));
  }
}
