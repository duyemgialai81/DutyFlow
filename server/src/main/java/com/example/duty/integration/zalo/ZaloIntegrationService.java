package com.example.duty.integration.zalo;

import com.example.duty.dto.MiscDtos.*;
import com.example.duty.entity.Employee;
import com.example.duty.entity.ZaloMapping;
import com.example.duty.exception.ApiException;
import com.example.duty.exception.ErrorCode;
import com.example.duty.repository.EmployeeRepository;
import com.example.duty.repository.ZaloMappingRepository;
import com.example.duty.util.SecurityUsers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * OAuth Zalo: connect → callback exchange → lưu mapping (token mã hoá).
 * Webhook: xác thực chữ ký HMAC-SHA256 trước khi xử lý (follow/unfollow...).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ZaloIntegrationService {

  private static final Map<String, Long> PENDING_STATES = new ConcurrentHashMap<>();

  private final ZaloClient zaloClient;
  private final ZaloProperties props;
  private final TokenCipher cipher;
  private final ZaloMappingRepository mappingRepository;
  private final EmployeeRepository employeeRepository;

  /* ================= OAuth ================= */

  public ZaloConnectResponse connect() {
    String state = UUID.randomUUID().toString();
    PENDING_STATES.put(state, System.currentTimeMillis());
    return new ZaloConnectResponse(zaloClient.buildAuthorizationUrl(state), state);
  }

  @Transactional
  public ZaloStatusResponse callback(String code, String state) {
    if (state == null || PENDING_STATES.remove(state) == null) {
      throw new ApiException(ErrorCode.VALIDATION_ERROR, "State OAuth không hợp lệ hoặc đã hết hạn.");
    }
    Long employeeId = SecurityUsers.currentEmployeeId();
    if (employeeId == null) {
      throw new ApiException(ErrorCode.VALIDATION_ERROR, "Tài khoản quản trị không cần kết nối Zalo cá nhân.");
    }
    try {
      ZaloClient.TokenPair pair = zaloClient.exchangeCode(code);
      Employee emp = employeeRepository.findById(employeeId)
          .orElseThrow(() -> new ApiException(ErrorCode.EMPLOYEE_NOT_FOUND, "Không tìm thấy nhân viên."));
      ZaloMapping m = mappingRepository.findByEmployeeId(employeeId).orElseGet(() -> {
        ZaloMapping nm = new ZaloMapping();
        nm.setEmployee(emp);
        return nm;
      });
      m.setZaloUserId(pair.userId());
      m.setStatus(ZaloMapping.Status.CONNECTED);
      m.setReceiveNotifications(true);
      // Token MÃ HOÁ trước khi lưu — không plaintext, không log
      m.setAccessTokenEnc(pair.accessToken() != null ? cipher.encrypt(pair.accessToken()) : null);
      m.setRefreshTokenEnc(pair.refreshToken() != null ? cipher.encrypt(pair.refreshToken()) : null);
      m.setConnectedAt(Instant.now());
      mappingRepository.save(m);
      return status();
    } catch (ZaloClient.ZaloApiException e) {
      throw new ApiException(ErrorCode.ZALO_API_ERROR, "Zalo từ chối uỷ quyền: " + e.getMessage());
    }
  }

  @Transactional(readOnly = true)
  public ZaloStatusResponse status() {
    Long me = SecurityUsers.currentEmployeeId();
    if (me == null) return new ZaloStatusResponse(false, null, null, false, null);
    return mappingRepository.findByEmployeeId(me)
        .filter(m -> m.getStatus() == ZaloMapping.Status.CONNECTED)
        .map(m -> new ZaloStatusResponse(true, mask(m.getZaloUserId()), m.getConnectedAt(), m.isReceiveNotifications(), me))
        .orElseGet(() -> new ZaloStatusResponse(false, null, null, true, me));
  }

  @Transactional
  public ZaloStatusResponse disconnect() {
    Long me = SecurityUsers.currentEmployeeId();
    if (me == null) throw new ApiException(ErrorCode.VALIDATION_ERROR, "Không xác định được nhân viên.");
    mappingRepository.findByEmployeeId(me).ifPresent(m -> {
      m.setStatus(ZaloMapping.Status.DISCONNECTED);
      mappingRepository.save(m);
    });
    return status();
  }

  @Transactional
  public ZaloStatusResponse preferences(boolean receive) {
    Long me = SecurityUsers.currentEmployeeId();
    if (me == null) throw new ApiException(ErrorCode.VALIDATION_ERROR, "Không xác định được nhân viên.");
    ZaloMapping m = mappingRepository.findByEmployeeId(me)
        .filter(x -> x.getStatus() == ZaloMapping.Status.CONNECTED)
        .orElseThrow(() -> new ApiException(ErrorCode.ZALO_NOT_CONNECTED, "Hãy kết nối Zalo trước khi bật nhận thông báo."));
    m.setReceiveNotifications(receive);
    mappingRepository.save(m);
    return status();
  }

  @Transactional(readOnly = true)
  public List<ZaloEmployeeRow> employeeRows() {
    SecurityUsers.requireAdmin();
    return employeeRepository.findAll().stream().map(e -> mappingRepository.findByEmployeeId(e.getId())
            .filter(m -> m.getStatus() == ZaloMapping.Status.CONNECTED)
            .map(m -> new ZaloEmployeeRow(e.getId(), e.getFullName(), e.getEmployeeCode(), true,
                mask(m.getZaloUserId()), m.getConnectedAt(), m.isReceiveNotifications()))
            .orElseGet(() -> new ZaloEmployeeRow(e.getId(), e.getFullName(), e.getEmployeeCode(),
                false, null, null, false)))
        .toList();
  }

  /* ================= Webhook ================= */

  /**
   * Zalo gửi kèm chữ ký HMAC-SHA256(secret, rawData). Phải xác thực trước khi xử lý.
   */
  public boolean verifyWebhookSignature(String rawBody, String signature) {
    String secret = props.webhookSecret();
    if (secret == null || secret.isBlank() || signature == null) return false;
    try {
      Mac mac = Mac.getInstance("HmacSHA256");
      mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
      String expected = HexFormat.of().formatHex(mac.doFinal(rawBody.getBytes(StandardCharsets.UTF_8)));
      return MessageDigest.isEqual(
          expected.getBytes(StandardCharsets.UTF_8),
          signature.getBytes(StandardCharsets.UTF_8));
    } catch (Exception e) {
      log.warn("Webhook signature verification failed: {}", e.getMessage());
      return false;
    }
  }

  private String mask(String zaloUserId) {
    if (zaloUserId == null || zaloUserId.length() <= 8) return zaloUserId;
    return zaloUserId.substring(0, 4) + "••••" + zaloUserId.substring(zaloUserId.length() - 4);
  }
}
