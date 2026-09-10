package com.example.duty.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "auth_session")
@Getter @Setter @NoArgsConstructor
public class AuthSession {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 64, unique = true)
  private String jti;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "employee_id")
  private Employee employee;

  @Column(name = "role_code", nullable = false, length = 32)
  private String roleCode;

  @Column(name = "token_hash", nullable = false, length = 64)
  private String tokenHash;

  @Column(name = "expires_at", nullable = false)
  private Instant expiresAt;

  @Column(name = "revoked_at")
  private Instant revokedAt;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private Instant createdAt;

  public boolean active() {
    return revokedAt == null && expiresAt != null && expiresAt.isAfter(Instant.now());
  }
}
