package com.example.duty.repository;

import com.example.duty.entity.Shift;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ShiftRepository extends JpaRepository<Shift, Long> {

  Optional<Shift> findByCode(String code);
}
