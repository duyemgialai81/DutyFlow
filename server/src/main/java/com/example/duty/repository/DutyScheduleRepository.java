package com.example.duty.repository;

import com.example.duty.entity.DutySchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DutyScheduleRepository
    extends JpaRepository<DutySchedule, Long>, JpaSpecificationExecutor<DutySchedule> {

  Optional<DutySchedule> findByDateAndShiftIdAndStatusNot(LocalDate date, Long shiftId, DutySchedule.Status status);

  List<DutySchedule> findAllByDateBetween(LocalDate from, LocalDate to);
}
