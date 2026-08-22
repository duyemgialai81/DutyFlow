package com.example.duty.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "duty_assignment")
@Getter @Setter @NoArgsConstructor
public class DutyAssignment {

  public enum Status {
    ASSIGNED, CONFIRMED, DECLINED, CANCELLED;

    public boolean active() {
      return this == ASSIGNED || this == CONFIRMED;
    }
  }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "schedule_id")
  private DutySchedule schedule;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "employee_id")
  private Employee employee;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private Status status = Status.ASSIGNED;

  @Column(name = "assigned_at", nullable = false)
  private Instant assignedAt;

  @Column(name = "confirmed_at")
  private Instant confirmedAt;

  @PrePersist
  void onCreate() {
    if (assignedAt == null) assignedAt = Instant.now();
  }
}
