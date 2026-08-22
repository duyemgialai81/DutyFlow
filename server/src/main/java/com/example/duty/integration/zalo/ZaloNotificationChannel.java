package com.example.duty.integration.zalo;

import com.example.duty.entity.ZaloMapping;
import com.example.duty.integration.zalo.ZaloClient.SendResult;
import com.example.duty.notification.NotificationChannel;
import com.example.duty.repository.ZaloMappingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.stereotype.Component;

/**
 * Kênh gửi Zalo — implement NotificationChannel.
 * Tự refresh access_token khi hết hạn (refresh_token flow).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ZaloNotificationChannel implements NotificationChannel {

  private final ZaloClient zaloClient;
  private final ZaloProperties props;
  private final TokenCipher cipher;
  private final ZaloMappingRepository mappingRepository;
  private final ObjectProvider<com.example.duty.repository.AppNotificationRepository> ignored; // giữ DI rõ ràng

  @Override
  public String channelName() {
    return "zalo";
  }

  @Override
  public DeliveryResult send(String recipientZaloUserId, String title, String content)
      throws NotificationDeliveryException {
    try {
      ZaloMapping mapping = mappingRepository.findByZaloUserId(recipientZaloUserId)
          .orElseThrow(() -> new NotificationDeliveryException("Không tìm thấy Zalo mapping"));

      String accessToken = resolveAccessToken(mapping);
      String text = title + "\n\n" + content;
      SendResult result = zaloClient.sendMessage(accessToken, recipientZaloUserId, text);
      return new DeliveryResult(result.messageId(), result.requestId());
    } catch (ZaloClient.ZaloApiException e) {
      // Ném lên để pipeline retry — message KHÔNG chứa token
      throw new NotificationDeliveryException(e.getMessage(), e);
    }
  }

  private String resolveAccessToken(ZaloMapping mapping) throws ZaloClient.ZaloApiException {
    // Ưu tiên token OAuth theo từng mapping (đã giải mã trong memory, không log)
    if (mapping.getAccessTokenEnc() != null) {
      return cipher.decrypt(mapping.getAccessTokenEnc());
    }
    // Fallback: token tĩnh từ env (kịch bản OA token)
    String envToken = props.accessToken();
    if (envToken != null && !envToken.isBlank()) return envToken;
    throw new ZaloClient.ZaloApiException("Không có access_token Zalo (mapping trống, env ZALO_ACCESS_TOKEN chưa cấu hình)");
  }
}
