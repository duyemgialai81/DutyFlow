package com.example.duty.security;

import com.example.duty.entity.Employee;
import com.example.duty.repository.EmployeeRepository;
import com.example.duty.util.SecurityUsers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Objects;

/**
 * Service kiểm tra thẩm quyền theo cấp bậc và phạm vi Khoa / Phòng ban (Role-based Department Access).
 * Sử dụng trong biểu thức Spring Security SpEL: @deptSecurity.isLeaderOf(#departmentId)
 */
@Slf4j
@Service("deptSecurity")
@RequiredArgsConstructor
public class DepartmentSecurityService {

  private final EmployeeRepository employeeRepository;

  /**
   * Kiểm tra người dùng có quyền quản trị đối với Khoa / Phòng ban chỉ định:
   * - ADMIN: Toàn quyền trên mọi khoa phòng.
   * - LEADER: Chỉ có quyền trên đúng Khoa phòng mà mình đang phụ trách.
   * - EMPLOYEE: Không có quyền quản trị khoa.
   */
  public boolean isLeaderOf(Long departmentId) {
    if (SecurityUsers.isAdmin()) {
      return true; // Quản trị viên hệ thống có toàn quyền
    }

    if (!SecurityUsers.isLeader()) {
      return false; // Nhân viên thường không có quyền quản trị
    }

    Long empId = SecurityUsers.currentEmployeeId();
    if (empId == null || departmentId == null) {
      return false;
    }

    Employee emp = employeeRepository.findById(empId).orElse(null);
    if (emp == null || emp.getDepartment() == null) {
      return false;
    }

    boolean matches = Objects.equals(emp.getDepartment().getId(), departmentId);
    if (!matches) {
      log.warn("Leader [id={}] cố gắng truy cập trái phép Khoa [id={}] nhưng trực thuộc Khoa [id={}]",
          empId, departmentId, emp.getDepartment().getId());
    }
    return matches;
  }
}
