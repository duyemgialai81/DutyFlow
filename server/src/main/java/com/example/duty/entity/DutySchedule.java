package com.example.duty.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "duty_schedule")
@Getter @Setter @NoArgsConstructor
public class DutySchedule {

  public enum Status {
    DRAFT, CONFIRMED, LOCKED, CANCELLED;

    public boolean editable() {
      return this == DRAFT || this == CONFIRMED;
    }
  }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(name = "`date`", nullable = false)
  private LocalDate date;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "shift_id")
  private Shift shift;

  @Column(name = "required_people", nullable = false)
  private int requiredPeople = 1;

  @Column(nullable = false, length = 150)
  private String location;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "department_id")
  private Department department;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private Status status = Status.DRAFT;

  @Column(name = "created_by", nullable = false, length = 150)
  private String createdBy;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private Instant createdAt;

  @UpdateTimestamp
  @Column(name = "updated_at")
  private Instant updatedAt;
}
