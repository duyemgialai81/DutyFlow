package com.example.duty.repository;

import com.example.duty.entity.ZaloMapping;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ZaloMappingRepository extends JpaRepository<ZaloMapping, Long> {

  Optional<ZaloMapping> findByEmployeeId(Long employeeId);

  Optional<ZaloMapping> findByZaloUserId(String zaloUserId);
}
