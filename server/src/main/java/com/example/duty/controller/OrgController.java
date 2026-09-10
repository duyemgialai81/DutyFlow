package com.example.duty.controller;

import com.example.duty.dto.ApiResponse;
import com.example.duty.dto.MiscDtos.*;
import com.example.duty.entity.Employee;
import com.example.duty.mapper.DutyMapper;
import com.example.duty.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class OrgController {

  private final DepartmentRepository departmentRepository;
  private final ShiftRepository shiftRepository;
  private final EmployeeRepository employeeRepository;
  private final DutyAssignmentRepository assignmentRepository;
  private final ZaloMappingRepository zaloMappingRepository;
  private final DutyMapper mapper;

  @GetMapping("/departments")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<List<DepartmentResponse>> departments() {
    return ApiResponse.ok(departmentRepository.findAll().stream()
        .map(d -> new DepartmentResponse(d.getId(), d.getName())).toList());
  }

  @GetMapping("/shifts")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<List<ShiftResponse>> shifts() {
    return ApiResponse.ok(shiftRepository.findAll().stream().map(mapper::toShift).toList());
  }

  @GetMapping("/employees")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<List<EmployeeResponse>> employees() {
    YearMonth currentMonth = YearMonth.now();
    LocalDate fromDate = currentMonth.atDay(1);
    LocalDate toDate = currentMonth.plusMonths(1).atDay(1);
    return ApiResponse.ok(employeeRepository.findAllWithDepartmentAndRole().stream().map(e -> new EmployeeResponse(
        e.getId(), e.getEmployeeCode(), e.getFullName(), e.getEmail(), e.getPhone(),
        e.getDepartment() != null ? e.getDepartment().getId() : null,
        e.getDepartment() != null ? e.getDepartment().getName() : null,
        e.getStatus(),
        assignmentRepository.countByEmployeeAndDateRange(e.getId(), fromDate, toDate),
        zaloMappingRepository.findByEmployeeId(e.getId())
            .map(m -> m.getStatus() == com.example.duty.entity.ZaloMapping.Status.CONNECTED)
            .orElse(false)
    )).toList());
  }
}
