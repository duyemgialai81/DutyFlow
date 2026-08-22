package com.example.duty.integration.zalo;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.Map;

/**
 * ZaloClient — điểm chạm DUY NHẤT với Zalo API (graph.zalo.me / oauth.zaloapp.com).
 * Interface + implementation tách rời để dễ mock khi test và đổi provider.
 *
 * LƯU Ý GIỚI HẠN THỰC TẾ:
 *  - Gửi tin nhắn cá nhân qua Social API cần app được Zalo duyệt quyền.
 *  - Zalo OA dùng endpoint /v2.0/oa/message/cs với OA access token + quota/ngày.
 *  - TUYỆT ĐỐI không log access token.
 */
public interface ZaloClient {

  /** Gửi tin nhắn text tới 1 zalo_user_id. Ném ZaloApiException khi Zalo trả lỗi. */
  SendResult sendMessage(String accessToken, String zaloUserId, String text) throws ZaloApiException;

  /** Exchange authorization code lấy token (OAuth Social API v4). */
  TokenPair exchangeCode(String code) throws ZaloApiException;

  /** Dùng refresh_token lấy access_token mới. */
  TokenPair refreshToken(String refreshToken) throws ZaloApiException;

  /** Xây URL uỷ quyền OAuth. */
  String buildAuthorizationUrl(String state);

  record TokenPair(String accessToken, String refreshToken, String userId, long expiresIn) {}

  record SendResult(String messageId, String requestId) {}

  class ZaloApiException extends Exception {
    public ZaloApiException(String message) { super(message); }
  }
}

@Slf4j
@Component
class ZaloRestClient implements ZaloClient {

  private final ZaloProperties props;
  private final RestClient http;

  ZaloRestClient(ZaloProperties props) {
    this.props = props;
    this.http = RestClient.builder()
        .connectTimeout(Duration.ofMillis(5000))
        .build();
  }

  @Override
  public SendResult sendMessage(String accessToken, String zaloUserId, String text) throws ZaloApiException {
    JsonNode res = post(props.api().baseUrl() + "/v2.0/oa/message/cs", accessToken, Map.of(
        "recipient", Map.of("user_id", zaloUserId),
        "message", Map.of("text", text)
    ));
    int err = res.path("error").asInt(0);
    if (err != 0) {
      // chỉ log error code + message, KHÔNG log token
      throw new ZaloApiException("Zalo API error " + err + ": " + res.path("message").asText("unknown"));
    }
    return new SendResult(res.path("message_id").asText(null), res.path("request_id").asText(null));
  }

  @Override
  public TokenPair exchangeCode(String code) throws ZaloApiException {
    JsonNode res = post(props.api().oauthUrl() + "/v4/oa/access_token", null, Map.of(
        "code", code,
        "app_id", props.appId(),
        "grant_type", "authorization_code",
        "secret_key", props.appSecret()
    ));
    guard(res);
    return new TokenPair(
        res.path("access_token").asText(),
        res.path("refresh_token").asText(null),
        res.path("user_id").asText(null),
        res.path("expires_in").asLong(3600));
  }

  @Override
  public TokenPair refreshToken(String refreshToken) throws ZaloApiException {
    JsonNode res = post(props.api().oauthUrl() + "/v4/oa/access_token", null, Map.of(
        "refresh_token", refreshToken,
        "app_id", props.appId(),
        "grant_type", "refresh_token",
        "secret_key", props.appSecret()
    ));
    guard(res);
    return new TokenPair(
        res.path("access_token").asText(),
        res.path("refresh_token").asText(refreshToken),
        res.path("user_id").asText(null),
        res.path("expires_in").asLong(3600));
  }

  @Override
  public String buildAuthorizationUrl(String state) {
    return props.api().oauthUrl() + "/v4/permission"
        + "?app_id=" + props.appId()
        + "&redirect_uri=" + props.callbackUrl()
        + "&state=" + state;
  }

  private JsonNode post(String url, String accessToken, Map<String, Object> body) throws ZaloApiException {
    try {
      var spec = http.post().uri(url)
          .contentType(MediaType.APPLICATION_JSON);
      if (accessToken != null) {
        spec = spec.header("access_token", accessToken)
                   .header("Authorization", "Bearer " + accessToken);
      }
      return spec.body(body).retrieve().body(JsonNode.class);
    } catch (Exception e) {
      throw new ZaloApiException("Không gọi được Zalo API: " + e.getMessage());
    }
  }

  private void guard(JsonNode res) throws ZaloApiException {
    if (res == null || res.path("error").asInt(0) != 0) {
      int err = res == null ? -1 : res.path("error").asInt();
      throw new ZaloApiException("Zalo OAuth error " + err + ": "
          + (res == null ? "empty response" : res.path("message").asText("unknown")));
    }
  }
}
