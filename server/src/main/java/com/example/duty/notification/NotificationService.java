package com.example.duty.notification;

import com.example.duty.dto.MiscDtos.NotificationResponse;
import com.example.duty.entity.AppNotification;
import com.example.duty.entity.AppNotification.Status;
import com.example.duty.entity.ZaloMapping;
import com.example.duty.exception.ApiException;
import com.example.duty.exception.ErrorCode;
import com.example.duty.mapper.DutyMapper;
import com.example.duty.repository.AppNotificationRepository;
import com.example.duty.repository.EmployeeRepository;
import com.example.duty.repository.ZaloMappingRepository;
import com.example.duty.util.SecurityUsers;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Pipeline thông báo: idempotency → PENDING (commit) → PROCESSING → kênh gửi →
 * SENT hoặc retry (RETRYING, tối đa 3 lần, backoff lũy thừa) → FAILED.
 * Không bao giờ ném lỗi ra nghiệp vụ tạo lịch.
 */
@Slf4j
@Service
public class NotificationService {

  private static final DateTimeFormatter DD_MM_YYYY = DateTimeFormatter.ofPattern("dd/MM/yyyy");

  private final AppNotificationRepository repository;
  private final EmployeeRepository employeeRepository;
  private final ZaloMappingRepository zaloMappingRepository;
  private final Map<String, NotificationChannel> channels;
  private final DutyMapper mapper;
  private final int maxAttempts;
  private final long initialBackoffMs;
  private final int multiplier;

  public NotificationService(AppNotificationRepository repository,
                             EmployeeRepository employeeRepository,
                             ZaloMappingRepository zaloMappingRepository,
                             List<NotificationChannel> channelList,
                             DutyMapper mapper,
                             @Value("${notification.retry.max-attempts:3}") int maxAttempts,
                             @Value("${notification.retry.initial-backoff-ms:2000}") long initialBackoffMs,
                             @Value("${notification.retry.multiplier:2}") int multiplier) {
    this.repository = repository;
    this.employeeRepository = employeeRepository;
    this.zaloMappingRepository = zaloMappingRepository;
    this.channels = channelList.stream().collect(java.util.stream.Collectors.toMap(
        NotificationChannel::channelName, c -> c));
    this.mapper = mapper;
    this.maxAttempts = maxAttempts;
    this.initialBackoffMs = initialBackoffMs;
    this.multiplier = multiplier;
  }

  /**
   * Tạo + gửi thông báo. Idempotency key do caller truyền (vd: employeeId:type:scheduleId:assignmentId)
   * để KHÔNG gửi trùng khi event bị lặp.
   */
  @Async("notificationExecutor")
  public void publish(Long employeeId, AppNotification.Type type, LocalDate date,
                      LocalTime start, LocalTime end, String location, String idempotencyKey) {
    if (repository.findByIdempotencyKey(idempotencyKey).isPresent()) {
      log.debug("Duplicate notification skipped: {}", idempotencyKey);
      return; // chống gửi trùng
    }

    var content = buildContent(type, date, start, end, location);
    AppNotification n = new AppNotification();
    n.setEmployee(employeeRepository.findById(employeeId).orElse(null));
    if (n.getEmployee() == null) return;
    n.setType(type);
    n.setTitle(content.title());
    n.setContent(content.body());
    n.setChannel(AppNotification.Channel.ZALO);
    n.setIdempotencyKey(idempotencyKey);
    n.setRequestId(UUID.randomUUID().toString());
    try {
      repository.save(n); // commit PENDING trước khi gửi
    } catch (DataIntegrityViolationException dup) {
      return; // race-condition: bản ghi trùng key vừa được tạo
    }
    deliver(n.getId());
  }

  /** Vòng gửi + retry. Chạy async, tách khỏi transaction nghiệp vụ. */
  void deliver(Long notificationId) {
    AppNotification n = repository.findById(notificationId).orElse(null);
    if (n == null || n.getStatus() == Status.SENT) return;

    n.setStatus(Status.PROCESSING);
    repository.save(n);

    try {
      NotificationChannel channel = channels.get(n.getChannel().name().toLowerCase());
      if (channel == null) throw new NotificationChannel.NotificationDeliveryException("Kênh không khả dụng: " + n.getChannel());

      ZaloMapping mapping = zaloMappingRepository.findByEmployeeId(n.getEmployee().getId()).orElse(null);
      if (mapping == null || mapping.getStatus() != ZaloMapping.Status.CONNECTED) {
        throw new NotificationChannel.NotificationDeliveryException("Nhân viên chưa kết nối Zalo — thiếu zalo_user_id");
      }
      if (!mapping.isReceiveNotifications()) {
        throw new NotificationChannel.NotificationDeliveryException("Nhân viên đã tắt nhận thông báo Zalo");
      }

      var result = channel.send(mapping.getZaloUserId(), n.getTitle(), n.getContent());
      n.setStatus(Status.SENT);
      n.setSentAt(Instant.now());
      n.setExternalMessageId(result.externalMessageId());
      n.setLastError(null);
      repository.save(n);
      log.info("Notification {} sent via {} (external={})", n.getId(), n.getChannel(), result.externalMessageId());
    } catch (NotificationChannel.NotificationDeliveryException ex) {
      handleFailure(n, ex.getMessage());
    }
  }

  private void handleFailure(AppNotification n, String error) {
    n.setLastError(truncate(error));
    if (n.getRetryCount() < maxAttempts) {
      n.setRetryCount(n.getRetryCount() + 1);
      n.setStatus(Status.RETRYING);
      repository.save(n);
      long backoff = initialBackoffMs * (long) Math.pow(multiplier, n.getRetryCount() - 1);
      log.warn("Notification {} failed (attempt {}/{}), retry in {}ms: {}",
          n.getId(), n.getRetryCount(), maxAttempts, backoff, error);
      scheduleRetry(n.getId(), backoff);
    } else {
      n.setStatus(Status.FAILED);
      repository.save(n);
      log.error("Notification {} permanently FAILED after {} attempts: {}", n.getId(), maxAttempts, error);
    }
  }

  private void scheduleRetry(Long id, long delayMs) {
    Thread.startVirtualThread(() -> {
      try {
        Thread.sleep(delayMs);
      } catch (InterruptedException ie) {
        Thread.currentThread().interrupt();
        return;
      }
      deliver(id);
    });
  }

  record MessageContent(String title, String body) {}

  MessageContent buildContent(AppNotification.Type type, LocalDate date, LocalTime start, LocalTime end, String location) {
    String d = date.format(DD_MM_YYYY);
    String hh = DateTimeFormatter.ofPattern("HH:mm").format(start) + " - " + DateTimeFormatter.ofPattern("HH:mm").format(end);
    return switch (type) {
      case SCHEDULE_ASSIGNED -> new MessageContent("\uD83D\uDCC5 LỊCH TRỰC MỚI",
          "Ngày: " + d + "\nCa: " + hh + "\nĐịa điểm: " + location
              + "\nBạn được phân công ca trực này.\nVui lòng kiểm tra và xác nhận.");
      case SCHEDULE_UPDATED -> new MessageContent("⚠️ LỊCH TRỰC ĐÃ THAY ĐỔI",
          "Ngày: " + d + "\nThời gian mới:\n" + hh + "\nVui lòng kiểm tra lại lịch.");
      case SCHEDULE_CANCELLED -> new MessageContent("❌ CA TRỰC ĐÃ HỦY",
          "Ca trực ngày " + d + " đã được hủy.");
      case SCHEDULE_CONFIRMED -> new MessageContent("✅ LỊCH TRỰC ĐÃ XÁC NHẬN",
          "Ca trực ngày " + d + " (" + hh + ") đã được xác nhận.");
    };
  }

  private String truncate(String s) {
    return s == null ? null : (s.length() > 480 ? s.substring(0, 480) : s);
  }

  /* ================= queries cho UI ================= */

  @Transactional(readOnly = true)
  public List<NotificationResponse> list(boolean all) {
    Long me = SecurityUsers.currentEmployeeId();
    List<AppNotification> list = (all && SecurityUsers.isAdmin())
        ? repository.findAllByOrderByIdDesc()
        : me != null ? repository.findAllByEmployeeIdOrderByIdDesc(me) : List.of();
    return list.stream().map(mapper::toNotification).toList();
  }

  @Transactional(readOnly = true)
  public long unreadCount() {
    Long me = SecurityUsers.currentEmployeeId();
    return me == null ? 0 : repository.countByEmployeeIdAndReadFalse(me);
  }

  @Transactional
  public void markRead(Long id) {
    repository.findById(id).ifPresent(n -> {
      Long me = SecurityUsers.currentEmployeeId();
      if (SecurityUsers.isAdmin() || (me != null && me.equals(n.getEmployee().getId()))) {
        n.setRead(true);
        repository.save(n);
      } else {
        throw new ApiException(ErrorCode.FORBIDDEN, "Không có quyền.");
      }
    });
  }

  @Transactional
  public void markAllRead() {
    Long me = SecurityUsers.currentEmployeeId();
    List<AppNotification> list = SecurityUsers.isAdmin()
        ? repository.findAll()
        : me != null ? repository.findAllByEmployeeIdOrderByIdDesc(me) : List.of();
    list.forEach(n -> n.setRead(true));
    repository.saveAll(list);
  }
}
