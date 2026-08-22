package com.example.duty.service;

import com.example.duty.dto.AutoAssignDtos.*;
import com.example.duty.dto.DutyDtos;
import com.example.duty.entity.*;
import com.example.duty.event.ScheduleEvents.*;
import com.example.duty.exception.ApiException;
import com.example.duty.exception.ErrorCode;
import com.example.duty.mapper.DutyMapper;
import com.example.duty.repository.*;
import com.example.duty.util.SecurityUsers;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class DutyScheduleService {

  private final DutyScheduleRepository scheduleRepository;
  private final DutyAssignmentRepository assignmentRepository;
  private final ScheduleHistoryRepository historyRepository;
  private final ShiftRepository shiftRepository;
  private final DepartmentRepository departmentRepository;
  private final ScheduleAlgorithmService algorithmService;
  private final DutyMapper mapper;
  private final ApplicationEventPublisher events;

  /* ================= CRUD ================= */

  @Transactional
  public DutyDtos.ScheduleResponse create(DutyDtos.CreateScheduleRequest req) {
    SecurityUsers.requireAdmin();
    if (req.requiredPeople() < 1) {
      throw new ApiException(ErrorCode.INVALID_REQUIRED_PEOPLE, "Số người cần phải lớn hơn 0.");
    }
    assertNoDuplicate(req.date(), req.shiftId(), null);

    DutySchedule s = new DutySchedule();
    s.setDate(req.date());
    s.setShift(shift(req.shiftId()));
    s.setRequiredPeople(req.requiredPeople());
    s.setLocation(req.location().trim());
    s.setDepartment(req.departmentId() != null ? department(req.departmentId()) : null);
    s.setStatus(req.status() == null ? DutySchedule.Status.DRAFT : req.status());
    s.setCreatedBy(SecurityUsers.currentName());
    scheduleRepository.save(s);
    history(s, "CREATE", null, req.date() + " " + s.getShift().getName());
    events.publishEvent(new ScheduleCreatedEvent(s, s.getCreatedBy())); // ScheduleCreatedEvent
    return toResponse(s);
  }

  @Transactional
  public DutyDtos.ScheduleResponse update(Long id, DutyDtos.UpdateScheduleRequest req) {
    SecurityUsers.requireAdmin();
    DutySchedule s = find(id);
    if (!s.getStatus().editable()) {
      throw s.getStatus() == DutySchedule.Status.LOCKED
          ? new ApiException(ErrorCode.SCHEDULE_LOCKED, "Ca trực đã khóa — không thể chỉnh sửa.")
          : new ApiException(ErrorCode.SCHEDULE_CANCELLED, "Ca trực đã bị hủy.");
    }
    String old = describe(s);
    LocalDate newDate = req.date() != null ? req.date() : s.getDate();
    Long newShiftId = req.shiftId() != null ? req.shiftId() : s.getShift().getId();
    if (req.date() != null || req.shiftId() != null) assertNoDuplicate(newDate, newShiftId, id);

    s.setDate(newDate);
    s.setShift(shift(newShiftId));
    if (req.requiredPeople() != null) s.setRequiredPeople(req.requiredPeople());
    if (req.location() != null) s.setLocation(req.location().trim());
    if (req.departmentId() != null) s.setDepartment(department(req.departmentId()));
    scheduleRepository.save(s);
    history(s, "UPDATE", old, describe(s));
    events.publishEvent(new ScheduleUpdatedEvent(s, describe(s), SecurityUsers.currentName()));
    return toResponse(s);
  }

  @Transactional(readOnly = true)
  public DutyDtos.ScheduleDetailResponse detail(Long id) {
    DutySchedule s = find(id);
    return new DutyDtos.ScheduleDetailResponse(
        toResponse(s),
        historyRepository.findAllByScheduleIdOrderByIdDesc(id).stream().map(mapper::toHistory).toList());
  }

  @Transactional
  public void delete(Long id) {
    SecurityUsers.requireAdmin();
    DutySchedule s = find(id);
    if (s.getStatus() != DutySchedule.Status.DRAFT) {
      throw new ApiException(ErrorCode.INVALID_TRANSITION, "Chỉ có thể xóa lịch ở trạng thái nháp.");
    }
    assignmentRepository.deleteAll(assignmentRepository.findAllByScheduleId(id));
    scheduleRepository.delete(s);
  }

  /* ================= transitions ================= */

  @Transactional
  public DutyDtos.ScheduleResponse confirm(Long id) {
    return transition(id, DutySchedule.Status.CONFIRMED, List.of(DutySchedule.Status.DRAFT), "CONFIRM");
  }

  @Transactional
  public DutyDtos.ScheduleResponse lock(Long id) {
    return transition(id, DutySchedule.Status.LOCKED,
        List.of(DutySchedule.Status.DRAFT, DutySchedule.Status.CONFIRMED), "LOCK");
  }

  @Transactional
  public DutyDtos.ScheduleResponse cancel(Long id) {
    SecurityUsers.requireAdmin();
    DutySchedule s = find(id);
    if (!List.of(DutySchedule.Status.DRAFT, DutySchedule.Status.CONFIRMED).contains(s.getStatus())) {
      throw new ApiException(ErrorCode.INVALID_TRANSITION, "Không thể hủy ca ở trạng thái " + s.getStatus() + ".");
    }
    List<Long> empIds = new ArrayList<>();
    assignmentRepository.findAllByScheduleId(id).forEach(a -> {
      if (a.getStatus().active()) {
        empIds.add(a.getEmployee().getId());
        a.setStatus(DutyAssignment.Status.CANCELLED);
        assignmentRepository.save(a);
      }
    });
    s.setStatus(DutySchedule.Status.CANCELLED);
    scheduleRepository.save(s);
    history(s, "CANCEL", "ACTIVE", "CANCELLED");
    events.publishEvent(new ScheduleCancelledEvent(s, empIds, SecurityUsers.currentName()));
    return toResponse(s);
  }

  private DutyDtos.ScheduleResponse transition(Long id, DutySchedule.Status to,
                                               List<DutySchedule.Status> from, String action) {
    SecurityUsers.requireAdmin();
    DutySchedule s = find(id);
    if (!from.contains(s.getStatus())) {
      throw new ApiException(ErrorCode.INVALID_TRANSITION,
          "Không thể chuyển ca trực từ " + s.getStatus() + " sang " + to + ".");
    }
    String old = s.getStatus().name();
    s.setStatus(to);
    scheduleRepository.save(s);
    history(s, action, old, to.name());
    if (to == DutySchedule.Status.CONFIRMED) {
      events.publishEvent(new ScheduleConfirmedEvent(s, SecurityUsers.currentName()));
    }
    return toResponse(s);
  }

  /* ================= calendar ================= */

  @Transactional(readOnly = true)
  public DutyDtos.CalendarResponse calendar(String month, Long departmentId, Long shiftId,
                                            String status, Long employeeId) {
    YearMonth ym = YearMonth.parse(month);
    Specification<DutySchedule> spec = (root, q, cb) -> {
      List<Predicate> ps = new ArrayList<>();
      ps.add(cb.between(root.get("date"), ym.atDay(1), ym.atEndOfMonth()));
      if (departmentId != null) ps.add(cb.equal(root.get("department").get("id"), departmentId));
      if (shiftId != null) ps.add(cb.equal(root.get("shift").get("id"), shiftId));
      if (status != null) ps.add(cb.equal(root.get("status"), DutySchedule.Status.valueOf(status)));
      if (employeeId != null) {
        var sub = q.subquery(Long.class);
        var a = sub.from(DutyAssignment.class);
        sub.select(a.get("id"))
            .where(cb.equal(a.get("schedule").get("id"), root.get("id")),
                   cb.equal(a.get("employee").get("id"), employeeId),
                   a.get("status").in(DutyAssignment.Status.ASSIGNED, DutyAssignment.Status.CONFIRMED));
        ps.add(cb.exists(sub));
      }
      return cb.and(ps.toArray(new Predicate[0]));
    };

    List<DutyDtos.ScheduleResponse> list = scheduleRepository.findAll(spec).stream()
        .sorted(java.util.Comparator.comparing(DutySchedule::getDate).thenComparing(s -> s.getShift().getId()))
        .map(this::toResponse)
        .toList();

    long totalAssignments = list.stream().mapToLong(s -> s.assignments().stream().filter(a -> a.status().active()).count()).sum();
    long confirmed = list.stream().mapToLong(s -> s.assignments().stream().filter(a -> a.status() == DutyAssignment.Status.CONFIRMED).count()).sum();

    return new DutyDtos.CalendarResponse(list, new DutyDtos.CalendarStats(
        list.stream().filter(s -> s.status() != DutySchedule.Status.CANCELLED).count(),
        list.stream().filter(s -> s.status() != DutySchedule.Status.CANCELLED
            && s.assignments().stream().filter(a -> a.status().active()).count() < s.requiredPeople()).count(),
        list.stream().filter(s -> s.status() == DutySchedule.Status.LOCKED).count(),
        confirmed, totalAssignments));
  }

  /* ================= auto assign ================= */

  @Transactional(readOnly = true)
  public AutoAssignPreviewResponse preview(AutoAssignRequest req) {
    SecurityUsers.requireAdmin();
    var plan = algorithmService.buildPlan(req);
    return new AutoAssignPreviewResponse(true, plan.items(), plan.warnings(), plan.totals());
  }

  @Transactional
  public AutoAssignConfirmResponse confirmAutoAssign(AutoAssignRequest req) {
    SecurityUsers.requireAdmin();
    var plan = algorithmService.buildPlan(req);
    int created = 0;
    for (PreviewItem item : plan.items()) {
      DutySchedule s = item.scheduleId() != null ? find(item.scheduleId()) : null;
      List<Long> newEmployeeIds = item.employees().stream().map(PreviewEmployee::id).toList();
      if (s == null) {
        s = new DutySchedule();
        s.setDate(item.date());
        s.setShift(shift(item.shiftId()));
        s.setRequiredPeople(item.requiredPeople());
        s.setLocation(item.location());
        s.setDepartment(req.departmentId() != null ? department(req.departmentId()) : null);
        s.setStatus(DutySchedule.Status.CONFIRMED);
        s.setCreatedBy(SecurityUsers.currentName());
        scheduleRepository.save(s);
        history(s, "CREATE", null, item.date() + " " + item.shiftName());
        history(s, "CONFIRM", "DRAFT", "CONFIRMED");
        created++;
      } else if (s.getStatus() == DutySchedule.Status.LOCKED) {
        continue; // không ghi đè lịch đã khóa
      } else if (s.getStatus() == DutySchedule.Status.DRAFT) {
        s.setStatus(DutySchedule.Status.CONFIRMED);
        scheduleRepository.save(s);
        history(s, "CONFIRM", "DRAFT", "CONFIRMED");
        created++;
      }
      List<Long> currentIds = assignmentRepository.findAllByScheduleId(s.getId()).stream()
          .filter(a -> a.getStatus().active()).map(a -> a.getEmployee().getId()).toList();
      List<Long> toAssign = newEmployeeIds.stream().filter(eid -> !currentIds.contains(eid)).toList();
      final DutySchedule fs = s;
      toAssign.forEach(eid -> {
        DutyAssignment a = new DutyAssignment();
        a.setSchedule(fs);
        a.setEmployee(new Employee() {{ setId(eid); }});
        a.setStatus(DutyAssignment.Status.ASSIGNED);
        assignmentRepository.save(a);
        history(fs, "ASSIGN", null, "employee#" + eid);
      });
      if (!toAssign.isEmpty()) {
        events.publishEvent(new ScheduleAssignedEvent(fs, toAssign, SecurityUsers.currentName()));
      }
    }
    return new AutoAssignConfirmResponse(true, created, plan.totals());
  }

  /* ================= helpers ================= */

  DutySchedule find(Long id) {
    return scheduleRepository.findById(id)
        .orElseThrow(() -> new ApiException(ErrorCode.SCHEDULE_NOT_FOUND, "Không tìm thấy ca trực."));
  }

  private Shift shift(Long id) {
    return shiftRepository.findById(id)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy ca trực (shift)."));
  }

  private Department department(Long id) {
    return departmentRepository.findById(id)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy phòng ban."));
  }

  void assertNoDuplicate(LocalDate date, Long shiftId, Long ignoreId) {
    scheduleRepository.findByDateAndShiftIdAndStatusNot(date, shiftId, DutySchedule.Status.CANCELLED)
        .ifPresent(dup -> {
          if (ignoreId == null || !dup.getId().equals(ignoreId)) {
            throw new ApiException(ErrorCode.DUTY_SCHEDULE_CONFLICT,
                "Đã tồn tại ca trực %s ngày %s. Không thể tạo lịch trùng."
                    .formatted(dup.getShift().getName().toLowerCase(), date));
          }
        });
  }

  DutyDtos.ScheduleResponse toResponse(DutySchedule s) {
    return mapper.toSchedule(s, assignmentRepository.findAllByScheduleId(s.getId()));
  }

  void history(DutySchedule s, String action, String oldValue, String newValue) {
    ScheduleHistory h = new ScheduleHistory();
    h.setSchedule(s);
    h.setAction(action);
    h.setOldValue(oldValue);
    h.setNewValue(newValue);
    h.setChangedBy(SecurityUsers.currentName());
    historyRepository.save(h);
  }

  private String describe(DutySchedule s) {
    return s.getDate() + " " + s.getShift().getName() + " @ " + s.getLocation() + " x" + s.getRequiredPeople();
  }
}
