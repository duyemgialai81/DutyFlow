package com.example.duty.notification;

import com.example.duty.entity.AppNotification;
import com.example.duty.entity.DutyAssignment;
import com.example.duty.repository.DutyAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

/**
 * Mỗi ngày lúc 7:00 AM, tự động gửi Zalo nhắc nhở đến tất cả nhân viên
 * có ca trực trong ngày hôm đó (status CONFIRMED hoặc ASSIGNED).
 *
 * Idempotency key: "reminder:{assignmentId}:{date}" — đảm bảo không gửi trùng
 * nếu scheduler bị trigger lại (restart, retry...).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DutyReminderScheduler {

  private final DutyAssignmentRepository assignmentRepository;
  private final NotificationService notificationService;

  /**
   * Gửi nhắc nhở ca trực lúc 7:00 AM hàng ngày (múi giờ Asia/Ho_Chi_Minh).
   * Có thể test thủ công bằng cách gọi POST /api/admin/trigger-reminder.
   */
  @Scheduled(cron = "0 0 7 * * *", zone = "Asia/Ho_Chi_Minh")
  @Transactional(readOnly = true)
  public void sendDailyReminders() {
    LocalDate today = LocalDate.now();
    log.info("[DutyReminder] Bắt đầu gửi nhắc nhở ca trực ngày {}", today);

    List<DutyAssignment> assignments = assignmentRepository.findTodayActiveAssignments(today);
    if (assignments.isEmpty()) {
      log.info("[DutyReminder] Không có ca trực nào hôm nay, bỏ qua.");
      return;
    }

    int sent = 0;
    for (DutyAssignment a : assignments) {
      try {
        String idemKey = "reminder:" + a.getId() + ":" + today;
        notificationService.publish(
            a.getEmployee().getId(),
            AppNotification.Type.DUTY_REMINDER,
            a.getSchedule().getDate(),
            a.getSchedule().getShift().getStartTime(),
            a.getSchedule().getShift().getEndTime(),
            a.getSchedule().getLocation(),
            idemKey
        );
        sent++;
      } catch (Exception ex) {
        log.warn("[DutyReminder] Lỗi khi gửi nhắc cho assignment {}: {}", a.getId(), ex.getMessage());
      }
    }
    log.info("[DutyReminder] Đã gửi nhắc nhở cho {} / {} ca trực ngày {}", sent, assignments.size(), today);
  }
}
