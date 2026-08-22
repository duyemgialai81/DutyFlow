package com.example.duty.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "notification")
@Getter @Setter @NoArgsConstructor
public class AppNotification {

  public enum Type { SCHEDULE_ASSIGNED, SCHEDULE_UPDATED, SCHEDULE_CANCELLED, SCHEDULE_CONFIRMED }

  public enum Channel { ZALO, IN_APP }

  public enum Status { PENDING, PROCESSING, SENT, FAILED, RETRYING }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "employee_id")
  private Employee employee;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 32)
  private Type type;

  @Column(nullable = false)
  private String title;

  @Column(nullable = false, columnDefinition = "TEXT")
  private String content;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private Channel channel = Channel.ZALO;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private Status status = Status.PENDING;

  @Column(name = "external_message_id", length = 120)
  private String externalMessageId;

  @Column(name = "request_id", length = 64)
  private String requestId;

  /** Chống gửi trùng — unique ở mức DB */
  @Column(name = "idempotency_key", nullable = false, length = 190, unique = true)
  private String idempotencyKey;

  @Column(name = "retry_count", nullable = false)
  private int retryCount = 0;

  @Column(name = "last_error", length = 500)
  private String lastError;

  @Column(name = "read_flag", nullable = false)
  private boolean read = false;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private Instant createdAt;

  @Column(name = "sent_at")
  private Instant sentAt;
}
