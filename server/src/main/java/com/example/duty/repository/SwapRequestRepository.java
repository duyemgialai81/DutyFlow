package com.example.duty.repository;

import com.example.duty.entity.SwapRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface SwapRequestRepository extends JpaRepository<SwapRequest, Long> {

  @Query("""
      select r from SwapRequest r
      join fetch r.employee e
      left join fetch e.department
      join fetch r.assignment a
      join fetch a.schedule s
      join fetch s.shift
      order by r.id desc
      """)
  List<SwapRequest> findAllWithDetails();

  @Query("""
      select r from SwapRequest r
      join fetch r.employee e
      left join fetch e.department
      join fetch r.assignment a
      join fetch a.schedule s
      join fetch s.shift
      where e.id = :employeeId
      order by r.id desc
      """)
  List<SwapRequest> findAllByEmployeeIdWithDetails(Long employeeId);
}
