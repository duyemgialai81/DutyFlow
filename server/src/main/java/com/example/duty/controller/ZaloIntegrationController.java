package com.example.duty.controller;

import com.example.duty.dto.ApiResponse;
import com.example.duty.dto.MiscDtos.*;
import com.example.duty.exception.ApiException;
import com.example.duty.exception.ErrorCode;
import com.example.duty.integration.zalo.ZaloClient;
import com.example.duty.integration.zalo.ZaloIntegrationService;
import com.example.duty.service.SystemSettingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/integrations/zalo")
@RequiredArgsConstructor
public class ZaloIntegrationController {

  private final ZaloIntegrationService service;
  private final SystemSettingService settingService;
  private final ZaloClient zaloClient;

  /** Frontend gọi để lấy URL uỷ quyền OAuth (KHÔNG trả app secret). */
  @GetMapping("/connect")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<ZaloConnectResponse> connect() {
    return ApiResponse.ok(service.connect());
  }

  /** Hoàn tất kết nối trực tiếp bằng Zalo User ID (hoặc sau OAuth). */
  @PostMapping("/connect/complete")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<ZaloStatusResponse> completeConnect(@RequestBody(required = false) Map<String, String> body) {
    String zaloUserId = body != null ? body.get("zaloUserId") : null;
    return ApiResponse.ok("Kết nối Zalo thành công.", service.completeConnect(zaloUserId));
  }

  /** Quản trị viên hỗ trợ kết nối Zalo cho nhân viên cụ thể. */
  @PostMapping("/connect/employee/{id}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<ZaloStatusResponse> connectForEmployee(@PathVariable Long id,
                                                           @RequestBody(required = false) Map<String, String> body) {
    String zaloUserId = body != null ? body.get("zaloUserId") : null;
    return ApiResponse.ok("Đã kết nối Zalo cho nhân viên.", service.connectForEmployee(id, zaloUserId));
  }

  @GetMapping("/dev-failure")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<Map<String, Boolean>> getDevFailure() {
    return ApiResponse.ok(Map.of("enabled", service.isDevFailureEnabled()));
  }

  @PutMapping("/dev-failure")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<Map<String, Boolean>> setDevFailure(@RequestBody Map<String, Boolean> body) {
    boolean enabled = Boolean.TRUE.equals(body.get("enabled"));
    service.setDevFailureEnabled(enabled);
    return ApiResponse.ok(Map.of("enabled", enabled));
  }

  /** Zalo redirect về đây sau khi người dùng đồng ý. */
  @GetMapping("/callback")
  @PreAuthorize("isAuthenticated()")
  public ResponseEntity<ApiResponse<ZaloStatusResponse>> callback(@RequestParam String code,
                                                                  @RequestParam(required = false) String state) {
    return ResponseEntity.ok(ApiResponse.ok("Kết nối Zalo thành công.", service.callback(code, state)));
  }

  @GetMapping("/status")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<ZaloStatusResponse> status() {
    return ApiResponse.ok(service.status());
  }

  @PostMapping("/disconnect")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<ZaloStatusResponse> disconnect() {
    return ApiResponse.ok("Đã ngắt kết nối.", service.disconnect());
  }

  @PutMapping("/preferences")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<ZaloStatusResponse> preferences(@Valid @RequestBody ZaloPreferenceRequest req) {
    return ApiResponse.ok(service.preferences(req.receiveNotifications()));
  }

  @GetMapping("/employees")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<List<ZaloEmployeeRow>> employees() {
    return ApiResponse.ok(service.employeeRows());
  }

  /**
   * Admin xem cấu hình Zalo App hiện tại (App Secret bị che).
   * Trả về isConfigured = true nếu cả App ID lẫn App Secret đã được lưu.
   */
  @GetMapping("/app-config")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<Map<String, Object>> getAppConfig() {
    String appId = settingService.getOrDefault("zalo.appId", "");
    String appSecret = settingService.getOrDefault("zalo.appSecret", "");
    String maskedSecret = appSecret.isBlank() ? "" : appSecret.substring(0, Math.min(4, appSecret.length())) + "••••••••";
    return ApiResponse.ok(Map.of(
        "appId", appId,
        "appSecretMasked", maskedSecret,
        "isConfigured", zaloClient.isConfigured()
    ));
  }

  /**
   * Admin lưu App ID + App Secret từ giao diện web.
   * App Secret được lưu nguyên văn trong DB (cần cân nhắc mã hoá ở môi trường prod).
   */
  @PutMapping("/app-config")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<Map<String, Object>> saveAppConfig(@RequestBody Map<String, String> body) {
    String appId = body.getOrDefault("appId", "").strip();
    String appSecret = body.getOrDefault("appSecret", "").strip();
    if (appId.isBlank() || appSecret.isBlank()) {
      throw new ApiException(ErrorCode.VALIDATION_ERROR, "Vui lòng nhập đầy đủ App ID và App Secret.");
    }
    settingService.set("zalo.appId", appId);
    settingService.set("zalo.appSecret", appSecret);
    log.info("Admin updated Zalo App config: appId={}", appId);
    String maskedSecret = appSecret.substring(0, Math.min(4, appSecret.length())) + "••••••••";
    return ApiResponse.ok("Đã lưu cấu hình Zalo App thành công.", Map.of(
        "appId", appId,
        "appSecretMasked", maskedSecret,
        "isConfigured", true
    ));
  }

  /**
   * Webhook Zalo (follow/unfollow user...). Public endpoint nhưng BẮT BUỘC
   * xác thực chữ ký HMAC trước khi xử lý.
   */

  @PostMapping("/webhook")
  public ResponseEntity<ApiResponse<Void>> webhook(@RequestBody String rawBody,
                                                   @RequestHeader(value = "X-Zalo-Signature", required = false) String signature) {
    if (!service.verifyWebhookSignature(rawBody, signature)) {
      log.warn("Zalo webhook rejected: invalid signature");
      return ResponseEntity.status(401).body(ApiResponse.error("INVALID_SIGNATURE", "Chữ ký webhook không hợp lệ."));
    }
    log.info("Zalo webhook received and verified ({} bytes)", rawBody.length());
    // TODO: xử lý event follow/unfollow theo nghiệp vụ
    return ResponseEntity.ok(ApiResponse.ok(null));
  }
}
