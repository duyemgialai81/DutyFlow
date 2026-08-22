package com.example.duty.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "day_off")
@Getter @Setter @NoArgsConstructor
public class DayOff {

  public enum Status {
    PENDING, APPROVED, REJECTED;

    /** Nhân viên nghỉ (chờ duyệt hoặc đã duyệt) đều bị loại khỏi phân ca */
    public boolean excludesFromDuty() {
      return this != REJECTED;
    }
  }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "employee_id")
  private Employee employee;

  @Column(name = "`date`", nullable = false)
  private LocalDate date;

  @Column(nullable = false)
  private String reason;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private Status status = Status.PENDING;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private Instant createdAt;
}
