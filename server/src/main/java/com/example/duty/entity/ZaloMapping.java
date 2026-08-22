package com.example.duty.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

/**
 * Mapping nhân viên ↔ tài khoản Zalo.
 * access/refresh token LUÔN lưu dạng mã hoá (AES-GCM) — xem integration/zalo/TokenCipher.
 */
@Entity
@Table(name = "zalo_mapping")
@Getter @Setter @NoArgsConstructor
public class ZaloMapping {

  public enum Status { CONNECTED, DISCONNECTED }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @OneToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "employee_id", unique = true)
  private Employee employee;

  @Column(name = "zalo_user_id", nullable = false, length = 64, unique = true)
  private String zaloUserId;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private Status status = Status.CONNECTED;

  @Column(name = "access_token_enc", length = 512)
  private String accessTokenEnc;

  @Column(name = "refresh_token_enc", length = 512)
  private String refreshTokenEnc;

  @Column(name = "receive_notifications", nullable = false)
  private boolean receiveNotifications = true;

  @CreationTimestamp
  @Column(name = "connected_at", updatable = false)
  private Instant connectedAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private Instant updatedAt;
}
