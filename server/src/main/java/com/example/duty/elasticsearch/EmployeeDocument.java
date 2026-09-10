package com.example.duty.elasticsearch;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

/**
 * Tài liệu chỉ mục Elasticsearch cho Nhân sự (Employee Index Document).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDocument implements Serializable {

  private Long employeeId;
  private String employeeCode;
  private String fullName;
  private String fullNameNormalized; // Tiếng Việt không dấu hỗ trợ tìm nhanh
  private String email;
  private String phone;
  private Long departmentId;
  private String departmentName;
  private String roleCode;
  private String status;
}
