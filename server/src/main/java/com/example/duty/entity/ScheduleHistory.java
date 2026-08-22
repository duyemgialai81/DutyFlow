package com.example.duty.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "schedule_history")
@Getter @Setter @NoArgsConstructor
public class ScheduleHistory {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  @JoinColumn(name = "schedule_id")
  private DutySchedule schedule;

  @Column(nullable = false, length = 32)
  private String action;

  @Column(name = "old_value", columnDefinition = "TEXT")
  private String oldValue;

  @Column(name = "new_value", columnDefinition = "TEXT")
  private String newValue;

  @Column(name = "changed_by", nullable = false, length = 150)
  private String changedBy;

  @CreationTimestamp
  @Column(name = "created_at", updatable = false)
  private Instant createdAt;
}
