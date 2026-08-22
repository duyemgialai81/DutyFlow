package com.example.duty.integration.zalo;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Toàn bộ cấu hình Zalo đọc từ environment — KHÔNG hard-code trong code.
 * ZALO_APP_ID / ZALO_APP_SECRET / ZALO_ACCESS_TOKEN / ZALO_REFRESH_TOKEN / ZALO_CALLBACK_URL
 */
@ConfigurationProperties(prefix = "zalo")
public record ZaloProperties(
    String appId,
    String appSecret,
    String accessToken,
    String refreshToken,
    String callbackUrl,
    String webhookSecret,
    String tokenCipherKey,
    Api api
) {

  public ZaloProperties {
    if (api == null) api = new Api("https://graph.zalo.me", "https://oauth.zaloapp.com");
  }

  public record Api(String baseUrl, String oauthUrl) {}
}
