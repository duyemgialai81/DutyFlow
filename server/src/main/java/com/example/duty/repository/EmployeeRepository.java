package com.example.duty.repository;

import com.example.duty.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {

  Optional<Employee> findByEmployeeCode(String employeeCode);

  List<Employee> findAllByStatus(Employee.Status status);

  List<Employee> findAllByDepartmentIdAndStatus(Long departmentId, Employee.Status status);
}
