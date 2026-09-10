package com.example.duty.repository;

import com.example.duty.entity.AuthSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

public interface AuthSessionRepository extends JpaRepository<AuthSession, Long> {

  Optional<AuthSession> findByJti(String jti);

  List<AuthSession> findAllByEmployeeIdAndRevokedAtIsNull(Long employeeId);

  @Modifying
  @Query("update AuthSession s set s.revokedAt = :now where s.employee.id = :employeeId and s.revokedAt is null")
  int revokeAllActive(@Param("employeeId") Long employeeId, @Param("now") Instant now);
}
