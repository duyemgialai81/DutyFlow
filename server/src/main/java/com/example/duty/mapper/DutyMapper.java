package com.example.duty.mapper;

import com.example.duty.dto.DutyDtos;
import com.example.duty.dto.MiscDtos;
import com.example.duty.entity.*;
import com.example.duty.repository.ZaloMappingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DutyMapper {

  private static final DateTimeFormatter HH_MM = DateTimeFormatter.ofPattern("HH:mm");
  private final ZaloMappingRepository zaloMappingRepository;

  public DutyDtos.AssignmentResponse toAssignment(DutyAssignment a) {
    Employee e = a.getEmployee();
    boolean zalo = zaloMappingRepository.findByEmployeeId(e.getId())
        .map(m -> m.getStatus() == ZaloMapping.Status.CONNECTED)
        .orElse(false);
    return new DutyDtos.AssignmentResponse(
        a.getId(), a.getSchedule().getId(), e.getId(), e.getFullName(), e.getEmployeeCode(),
        e.getDepartment() != null ? e.getDepartment().getName() : null,
        zalo, a.getStatus(), a.getAssignedAt(), a.getConfirmedAt());
  }

  public DutyDtos.ScheduleResponse toSchedule(DutySchedule s, List<DutyAssignment> assignments) {
    return new DutyDtos.ScheduleResponse(
        s.getId(), s.getDate(), s.getShift().getId(), s.getShift().getName(), s.getShift().getCode(),
        s.getShift().getStartTime(), s.getShift().getEndTime(), s.getRequiredPeople(), s.getLocation(),
        s.getDepartment() != null ? s.getDepartment().getId() : null,
        s.getDepartment() != null ? s.getDepartment().getName() : null,
        s.getStatus(), s.getCreatedBy(), s.getCreatedAt(),
        assignments.stream().map(this::toAssignment).toList());
  }

  public DutyDtos.HistoryResponse toHistory(ScheduleHistory h) {
    return new DutyDtos.HistoryResponse(h.getId(), h.getAction(), h.getOldValue(), h.getNewValue(), h.getChangedBy(), h.getCreatedAt());
  }

  public MiscDtos.ShiftResponse toShift(Shift s) {
    return new MiscDtos.ShiftResponse(s.getId(), s.getCode(), s.getName(),
        s.getStartTime().format(HH_MM), s.getEndTime().format(HH_MM), s.getDescription());
  }

  public MiscDtos.DayOffResponse toDayOff(DayOff d) {
    return new MiscDtos.DayOffResponse(d.getId(), d.getEmployee().getId(), d.getEmployee().getFullName(),
        d.getDate(), d.getReason(), d.getStatus());
  }

  public MiscDtos.NotificationResponse toNotification(AppNotification n) {
    return new MiscDtos.NotificationResponse(
        n.getId(), n.getEmployee().getId(), n.getEmployee().getFullName(), n.getType(),
        n.getTitle(), n.getContent(), n.getChannel(), n.getStatus(),
        n.getExternalMessageId(), n.getRetryCount(), n.getLastError(), n.isRead(), n.getCreatedAt(), n.getSentAt());
  }
}
