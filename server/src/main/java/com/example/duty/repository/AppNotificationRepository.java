package com.example.duty.repository;

import com.example.duty.entity.AppNotification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {

  Optional<AppNotification> findByIdempotencyKey(String idempotencyKey);

  List<AppNotification> findAllByEmployeeIdOrderByIdDesc(Long employeeId);

  List<AppNotification> findAllByOrderByIdDesc();

  long countByEmployeeIdAndReadFalse(Long employeeId);

  List<AppNotification> findAllByStatusIn(List<AppNotification.Status> statuses);
}
