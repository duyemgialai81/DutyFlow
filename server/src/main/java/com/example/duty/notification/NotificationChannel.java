package com.example.duty.notification;

/**
 * Trừu tượng kênh gửi thông báo.
 * Zalo chỉ là MỘT provider — có thể thay bằng ZaloOAChannel, ZnsChannel, SmsChannel...
 * mà không đổi nghiệp vụ phân lịch.
 */
public interface NotificationChannel {

  String channelName();

  /**
   * @return result của lần gửi này
   * @throws NotificationDeliveryException khi kênh báo lỗi (pipeline sẽ retry)
   */
  DeliveryResult send(String recipientId, String title, String content) throws NotificationDeliveryException;

  record DeliveryResult(String externalMessageId, String requestId) {}

  class NotificationDeliveryException extends Exception {
    public NotificationDeliveryException(String message) { super(message); }
    public NotificationDeliveryException(String message, Throwable cause) { super(message, cause); }
  }
}
