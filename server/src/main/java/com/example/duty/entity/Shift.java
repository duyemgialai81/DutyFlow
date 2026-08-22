package com.example.duty.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

@Entity
@Table(name = "shift")
@Getter @Setter @NoArgsConstructor
public class Shift {

  public enum Status { ACTIVE, INACTIVE }

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, length = 16, unique = true)
  private String code; // MORNING | AFTERNOON | NIGHT

  @Column(nullable = false, length = 60)
  private String name;

  @Column(name = "start_time", nullable = false)
  private LocalTime startTime;

  @Column(name = "end_time", nullable = false)
  private LocalTime endTime;

  @Column(length = 255)
  private String description;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 16)
  private Status status = Status.ACTIVE;

  public boolean overlaps(Shift other) {
    return startTime.isBefore(other.endTime) && other.startTime.isBefore(endTime);
  }
}
