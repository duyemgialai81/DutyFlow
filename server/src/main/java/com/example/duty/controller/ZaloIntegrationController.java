package com.example.duty.controller;

import com.example.duty.dto.ApiResponse;
import com.example.duty.dto.MiscDtos.*;
import com.example.duty.integration.zalo.ZaloIntegrationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/integrations/zalo")
@RequiredArgsConstructor
public class ZaloIntegrationController {

  private final ZaloIntegrationService service;

  /** Frontend gọi để lấy URL uỷ quyền OAuth (KHÔNG trả app secret). */
  @GetMapping("/connect")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<ZaloConnectResponse> connect() {
    return ApiResponse.ok(service.connect());
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
