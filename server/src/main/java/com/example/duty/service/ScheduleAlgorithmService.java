package com.example.duty.service;

import com.example.duty.dto.AutoAssignDtos.*;
import com.example.duty.entity.*;
import com.example.duty.exception.ApiException;
import com.example.duty.exception.ErrorCode;
import com.example.duty.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Thuật toán phân ca tự động:
 *  1. Lấy nhân viên đủ điều kiện (ACTIVE, đúng phòng ban nếu chỉ định)
 *  2. Loại nhân viên đang nghỉ (PENDING/APPROVED)
 *  3. Loại nhân viên đã có ca trùng khung giờ trong ngày
 *  4. Kiểm tra giới hạn số ca/tháng
 *  5. Đếm số ca hiện tại trong tháng của từng người
 *  6. Ưu tiên người ít ca hơn (công bằng)
 *  7. Phân bổ đủ requiredPeople
 *  8. Thiếu người → trả warning
 *  9. Không ghi đè lịch LOCKED
 * 10. Chạy preview trước khi lưu (commit ở method khác)
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduleAlgorithmService {

  static final int MAX_SHIFT_PER_MONTH = 10;
  private static final DateTimeFormatter DD_MM = DateTimeFormatter.ofPattern("dd/MM");

  private final EmployeeRepository employeeRepository;
  private final ShiftRepository shiftRepository;
  private final DutyScheduleRepository scheduleRepository;
  private final DutyAssignmentRepository assignmentRepository;
  private final DayOffRepository dayOffRepository;

  public PreviewResult buildPlan(AutoAssignRequest req) {
    Shift shift = shiftRepository.findById(req.shiftId())
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy ca trực."));

    List<PreviewItem> items = new ArrayList<>();
    List<PreviewWarning> warnings = new ArrayList<>();
    Map<Long, Long> planned = new HashMap<>(); // employeeId → số ca dự kiến thêm trong đợt này
    long slots = 0, assigned = 0;

    LocalDate cursor = req.startDate();
    while (!cursor.isAfter(req.endDate())) {
      final LocalDate date = cursor;
      Optional<DutySchedule> existingOpt =
          scheduleRepository.findByDateAndShiftIdAndStatusNot(date, req.shiftId(), DutySchedule.Status.CANCELLED);

      if (existingOpt.isPresent() && existingOpt.get().getStatus() == DutySchedule.Status.LOCKED) {
        warnings.add(new PreviewWarning(PreviewWarning.Level.INFO, date,
            "Ngày %s: ca đã KHÓA — hệ thống không ghi đè.".formatted(date.format(DD_MM))));
        cursor = cursor.plusDays(1);
        continue;
      }

      long currentAssigned = existingOpt
          .map(s -> assignmentRepository.findAllByScheduleId(s.getId()).stream()
              .filter(a -> a.getStatus().active()).count())
          .orElse(0L);
      long need = Math.max(0, req.requiredPeople() - currentAssigned);
      slots += need;

      String month = date.format(DateTimeFormatter.ofPattern("yyyy-MM"));

      if (need == 0 && existingOpt.isPresent()) {
        items.add(item(existingOpt.get(), shift, true, month, planned));
        cursor = cursor.plusDays(1);
        continue;
      }

      List<Employee> candidates = employeeRepository.findAllByStatus(Employee.Status.ACTIVE).stream()
          .filter(e -> req.departmentId() == null || (e.getDepartment() != null && e.getDepartment().getId().equals(req.departmentId())))
          .filter(e -> {
            if (dayOffRepository.existsByEmployeeIdAndDateAndStatusNot(e.getId(), date, DayOff.Status.REJECTED)) {
              warnings.add(new PreviewWarning(PreviewWarning.Level.INFO, date,
                  "%s nghỉ phép ngày %s — đã loại khỏi danh sách.".formatted(e.getFullName(), date.format(DD_MM))));
              return false;
            }
            if (!assignmentRepository.findConflicting(e.getId(), date, shift.getStartTime(), shift.getEndTime()).isEmpty()) {
              warnings.add(new PreviewWarning(PreviewWarning.Level.INFO, date,
                  "%s đã có ca trùng giờ ngày %s — đã loại.".formatted(e.getFullName(), date.format(DD_MM))));
              return false;
            }
            if (currentLoad(e.getId(), month, planned) >= MAX_SHIFT_PER_MONTH) {
              warnings.add(new PreviewWarning(PreviewWarning.Level.INFO, date,
                  "%s đã đạt giới hạn %d ca/tháng.".formatted(e.getFullName(), MAX_SHIFT_PER_MONTH)));
              return false;
            }
            return true;
          })
          // Ưu tiên người ít ca hơn; ổn định theo tên
          .sorted(Comparator
              .comparingLong((Employee e) -> currentLoad(e.getId(), month, planned))
              .thenComparing(Employee::getFullName))
          .toList();

      List<Employee> chosen = candidates.subList(0, (int) Math.min(need, candidates.size()));
      chosen.forEach(e -> planned.merge(e.getId(), 1L, Long::sum));
      assigned += chosen.size();
      if (chosen.size() < need) {
        warnings.add(new PreviewWarning(PreviewWarning.Level.WARN, date,
            "Ngày %s không đủ nhân sự — thiếu %d/%d người.".formatted(date.format(DD_MM), need - chosen.size(), need)));
      }

      items.add(new PreviewItem(
          existingOpt.map(DutySchedule::getId).orElse(null),
          existingOpt.isPresent(),
          date, shift.getId(), shift.getName(),
          shift.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")),
          shift.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm")),
          existingOpt.map(DutySchedule::getLocation).orElse(req.location()),
          req.requiredPeople(),
          buildEmployees(existingOpt.orElse(null), chosen, month, planned)));

      cursor = cursor.plusDays(1);
    }

    return new PreviewResult(items, warnings,
        new PreviewTotals(items.size(), slots, assigned, slots - assigned));
  }

  private List<PreviewEmployee> buildEmployees(DutySchedule existing, List<Employee> chosen,
                                               String month, Map<Long, Long> planned) {
    List<PreviewEmployee> out = new ArrayList<>();
    if (existing != null) {
      assignmentRepository.findAllByScheduleId(existing.getId()).stream()
          .filter(a -> a.getStatus().active())
          .forEach(a -> out.add(new PreviewEmployee(a.getEmployee().getId(), a.getEmployee().getFullName(),
              currentLoad(a.getEmployee().getId(), month, planned))));
    }
    chosen.forEach(e -> out.add(new PreviewEmployee(e.getId(), e.getFullName(), currentLoad(e.getId(), month, planned))));
    return out;
  }

  private PreviewItem item(DutySchedule s, Shift shift, boolean existing, String month, Map<Long, Long> planned) {
    return new PreviewItem(s.getId(), existing, s.getDate(), shift.getId(), shift.getName(),
        shift.getStartTime().format(DateTimeFormatter.ofPattern("HH:mm")),
        shift.getEndTime().format(DateTimeFormatter.ofPattern("HH:mm")),
        s.getLocation(), s.getRequiredPeople(), buildEmployees(s, List.of(), month, planned));
  }

  long currentLoad(Long employeeId, String month, Map<Long, Long> planned) {
    return assignmentRepository.countByEmployeeAndMonth(employeeId, month) + planned.getOrDefault(employeeId, 0L);
  }

  public record PreviewResult(List<PreviewItem> items, List<PreviewWarning> warnings, PreviewTotals totals) {}
}
