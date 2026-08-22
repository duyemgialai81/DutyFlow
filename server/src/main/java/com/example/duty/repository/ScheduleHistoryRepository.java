package com.example.duty.repository;

import com.example.duty.entity.ScheduleHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ScheduleHistoryRepository extends JpaRepository<ScheduleHistory, Long> {

  List<ScheduleHistory> findAllByScheduleIdOrderByIdDesc(Long scheduleId);
}
