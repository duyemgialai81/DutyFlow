package com.example.duty.repository;

import com.example.duty.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
  Optional<Employee> findByEmployeeCode(String employeeCode);
  Optional<Employee> findByEmployeeCodeIgnoreCase(String employeeCode);
  @Query("""
      select e from Employee e
      left join fetch e.department
      left join fetch e.role
      where lower(trim(e.employeeCode)) = lower(trim(:code))
      """)
  Optional<Employee> findByEmployeeCodeWithRole(@org.springframework.data.repository.query.Param("code") String code);
  List<Employee> findAllByStatus(Employee.Status status);
  List<Employee> findAllByDepartmentIdAndStatus(Long departmentId, Employee.Status status);
  @Query("""
      select distinct e from Employee e
      left join fetch e.department
      left join fetch e.role
      """)
  List<Employee> findAllWithDepartmentAndRole();
}
