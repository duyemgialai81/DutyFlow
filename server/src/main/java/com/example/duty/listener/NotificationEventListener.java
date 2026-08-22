package com.example.duty.listener;

import com.example.duty.entity.AppNotification;
import com.example.duty.event.ScheduleEvents.*;
import com.example.duty.notification.NotificationService;
import com.example.duty.repository.DutyAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Flow: ScheduleService → publishEvent() → [AFTER_COMMIT] → NotificationEventListener
 *      → NotificationService → ZaloNotificationChannel → Zalo API.
 * AFTER_COMMIT + @Async ⇒ lỗi Zalo KHÔNG ảnh hưởng transaction tạo lịch.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

  private final NotificationService notificationService;
  private final DutyAssignmentRepository assignmentRepository;

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onAssigned(ScheduleAssignedEvent e) {
    var s = e.schedule();
    e.employeeIds().forEach(empId -> notificationService.publish(
        empId, AppNotification.Type.SCHEDULE_ASSIGNED,
        s.getDate(), s.getShift().getStartTime(), s.getShift().getEndTime(), s.getLocation(),
        "%d:SCHEDULE_ASSIGNED:%d:%s".formatted(empId, s.getId(), s.getUpdatedAt())));
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onUpdated(ScheduleUpdatedEvent e) {
    var s = e.schedule();
    assignmentRepository.findAllByScheduleId(s.getId()).stream()
        .filter(a -> a.getStatus().active())
        .map(a -> a.getEmployee().getId())
        .distinct()
        .forEach(empId -> notificationService.publish(
            empId, AppNotification.Type.SCHEDULE_UPDATED,
            s.getDate(), s.getShift().getStartTime(), s.getShift().getEndTime(), s.getLocation(),
            "%d:SCHEDULE_UPDATED:%d:%s".formatted(empId, s.getId(), s.getUpdatedAt())));
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onCancelled(ScheduleCancelledEvent e) {
    var s = e.schedule();
    e.employeeIds().forEach(empId -> notificationService.publish(
        empId, AppNotification.Type.SCHEDULE_CANCELLED,
        s.getDate(), s.getShift().getStartTime(), s.getShift().getEndTime(), s.getLocation(),
        "%d:SCHEDULE_CANCELLED:%d:%s".formatted(empId, s.getId(), s.getUpdatedAt())));
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onCreated(ScheduleCreatedEvent e) {
    log.info("Schedule created #{} by {}", e.schedule().getId(), e.actor());
  }

  @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
  public void onConfirmed(ScheduleConfirmedEvent e) {
    log.info("Schedule confirmed #{} by {}", e.schedule().getId(), e.actor());
  }
}
