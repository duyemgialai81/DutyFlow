package com.example.duty.service;

import com.example.duty.dto.DutyDtos;
import com.example.duty.entity.*;
import com.example.duty.event.ScheduleEvents.ScheduleAssignedEvent;
import com.example.duty.exception.ApiException;
import com.example.duty.exception.ErrorCode;
import com.example.duty.repository.*;
import com.example.duty.util.SecurityUsers;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AssignmentService {

  private final DutyScheduleRepository scheduleRepository;
  private final DutyAssignmentRepository assignmentRepository;
  private final EmployeeRepository employeeRepository;
  private final DayOffRepository dayOffRepository;
  private final DutyScheduleService scheduleService;
  private final ApplicationEventPublisher events;

  @Transactional
  public DutyDtos.ScheduleResponse add(Long scheduleId, Long employeeId) {
    SecurityUsers.requireAdmin();
    DutySchedule s = editableSchedule(scheduleId);
    validateTarget(s, employeeId);

    DutyAssignment a = new DutyAssignment();
    a.setSchedule(s);
    a.setEmployee(employee(employeeId));
    a.setStatus(DutyAssignment.Status.ASSIGNED);
    assignmentRepository.save(a);
    scheduleService.history(s, "ASSIGN", null, a.getEmployee().getFullName());
    events.publishEvent(new ScheduleAssignedEvent(s, List.of(employeeId), SecurityUsers.currentName()));
    return scheduleService.toResponse(s);
  }

  @Transactional
  public DutyDtos.ScheduleResponse replace(Long scheduleId, Long assignmentId, Long newEmployeeId) {
    SecurityUsers.requireAdmin();
    DutySchedule s = editableSchedule(scheduleId);
    DutyAssignment old = findAssignment(scheduleId, assignmentId);
    validateTarget(s, newEmployeeId);

    String oldName = old.getEmployee().getFullName();
    old.setStatus(DutyAssignment.Status.CANCELLED);
    assignmentRepository.save(old);

    DutyAssignment a = new DutyAssignment();
    a.setSchedule(s);
    a.setEmployee(employee(newEmployeeId));
    a.setStatus(DutyAssignment.Status.ASSIGNED);
    assignmentRepository.save(a);

    scheduleService.history(s, "REPLACE", oldName, a.getEmployee().getFullName());
    events.publishEvent(new ScheduleAssignedEvent(s, List.of(newEmployeeId), SecurityUsers.currentName()));
    return scheduleService.toResponse(s);
  }

  @Transactional
  public DutyDtos.ScheduleResponse remove(Long scheduleId, Long assignmentId) {
    SecurityUsers.requireAdmin();
    DutySchedule s = editableSchedule(scheduleId);
    DutyAssignment a = findAssignment(scheduleId, assignmentId);
    scheduleService.history(s, "REMOVE_ASSIGN", a.getEmployee().getFullName(), null);
    a.setStatus(DutyAssignment.Status.CANCELLED);
    assignmentRepository.save(a);
    return scheduleService.toResponse(s);
  }

  @Transactional
  public DutyDtos.ScheduleResponse respond(Long scheduleId, Long assignmentId, boolean accept) {
    DutyAssignment a = findAssignment(scheduleId, assignmentId);
    Long me = SecurityUsers.currentEmployeeId();
    if (!SecurityUsers.isAdmin() && (me == null || !me.equals(a.getEmployee().getId()))) {
      throw new ApiException(ErrorCode.FORBIDDEN, "Bạn chỉ có thể xác nhận ca trực của chính mình.");
    }
    if (a.getStatus() != DutyAssignment.Status.ASSIGNED) {
      throw new ApiException(ErrorCode.INVALID_TRANSITION, "Chỉ có thể phản hồi khi ca đang ở trạng thái chờ xác nhận.");
    }
    a.setStatus(accept ? DutyAssignment.Status.CONFIRMED : DutyAssignment.Status.DECLINED);
    if (accept) a.setConfirmedAt(Instant.now());
    assignmentRepository.save(a);
    scheduleService.history(a.getSchedule(),
        accept ? "EMPLOYEE_CONFIRM" : "EMPLOYEE_DECLINE", "ASSIGNED", a.getStatus().name());
    return scheduleService.toResponse(a.getSchedule());
  }

  @Transactional(readOnly = true)
  public List<DutyDtos.MyDutyItem> myDutyItems(LocalDate from, LocalDate to, Long employeeId) {
    if (employeeId == null) return List.of();
    return assignmentRepository
        .findAllByEmployeeIdAndStatusIn(employeeId, List.of(DutyAssignment.Status.ASSIGNED, DutyAssignment.Status.CONFIRMED))
        .stream()
        .map(a -> a.getSchedule())
        .filter(s -> s.getStatus() != DutySchedule.Status.CANCELLED)
        .filter(s -> from == null || !s.getDate().isBefore(from))
        .filter(s -> to == null || !s.getDate().isAfter(to))
        .sorted(java.util.Comparator.comparing(DutySchedule::getDate))
        .map(s -> {
          DutyAssignment mine = assignmentRepository.findAllByScheduleId(s.getId()).stream()
              .filter(a -> a.getEmployee().getId().equals(employeeId) && a.getStatus().active())
              .findFirst().orElseThrow();
          return new DutyDtos.MyDutyItem(mine.getId(), mine.getStatus(), scheduleService.toResponse(s));
        })
        .toList();
  }

  @Transactional(readOnly = true)
  public List<DutyDtos.MyDutyItem> myCalendar(LocalDate from, LocalDate to) {
    return myDutyItems(from, to, SecurityUsers.currentEmployeeId());
  }

  /* ---------- validation ---------- */

  private DutySchedule editableSchedule(Long scheduleId) {
    DutySchedule s = scheduleService.find(scheduleId);
    if (s.getStatus() == DutySchedule.Status.LOCKED) {
      throw new ApiException(ErrorCode.SCHEDULE_LOCKED, "Ca trực đã khóa — không thể thay đổi nhân sự.");
    }
    if (s.getStatus() == DutySchedule.Status.CANCELLED) {
      throw new ApiException(ErrorCode.SCHEDULE_CANCELLED, "Ca trực đã bị hủy.");
    }
    return s;
  }

  private void validateTarget(DutySchedule s, Long employeeId) {
    Employee e = employee(employeeId);
    if (e.getStatus() != Employee.Status.ACTIVE) {
      throw new ApiException(ErrorCode.EMPLOYEE_NOT_FOUND, "Nhân viên không tồn tại hoặc đã nghỉ việc.");
    }
    if (dayOffRepository.existsByEmployeeIdAndDateAndStatusNot(employeeId, s.getDate(), DayOff.Status.REJECTED)) {
      throw new ApiException(ErrorCode.EMPLOYEE_ON_DAY_OFF,
          "%s đã đăng ký nghỉ ngày %s.".formatted(e.getFullName(), s.getDate()));
    }
    if (!assignmentRepository.findConflicting(employeeId, s.getDate(),
        s.getShift().getStartTime(), s.getShift().getEndTime()).isEmpty()) {
      throw new ApiException(ErrorCode.ASSIGNMENT_CONFLICT,
          "%s đã có ca trực trong khoảng thời gian này.".formatted(e.getFullName()));
    }
    boolean already = assignmentRepository.findAllByScheduleId(s.getId()).stream()
        .anyMatch(a -> a.getEmployee().getId().equals(employeeId) && a.getStatus().active());
    if (already) {
      throw new ApiException(ErrorCode.ASSIGNMENT_DUPLICATE, e.getFullName() + " đã nằm trong ca trực này.");
    }
  }

  private DutyAssignment findAssignment(Long scheduleId, Long assignmentId) {
    return assignmentRepository.findById(assignmentId)
        .filter(a -> a.getSchedule().getId().equals(scheduleId))
        .orElseThrow(() -> new ApiException(ErrorCode.ASSIGNMENT_NOT_FOUND, "Không tìm thấy phân công."));
  }

  private Employee employee(Long id) {
    return employeeRepository.findById(id)
        .orElseThrow(() -> new ApiException(ErrorCode.EMPLOYEE_NOT_FOUND, "Không tìm thấy nhân viên."));
  }
}
