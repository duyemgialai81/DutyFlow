package com.example.duty.repository;

import com.example.duty.entity.DayOff;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface DayOffRepository extends JpaRepository<DayOff, Long> {

  List<DayOff> findAllByEmployeeId(Long employeeId);

  boolean existsByEmployeeIdAndDateAndStatusNot(Long employeeId, LocalDate date, DayOff.Status status);

  List<DayOff> findAllByDateAndStatusNot(LocalDate date, DayOff.Status status);
}
