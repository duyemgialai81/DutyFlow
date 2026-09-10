package com.example.duty.elasticsearch;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Tiêu chí tìm kiếm đa chiều siêu tốc cho Index Lịch trực.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduleSearchCriteria {

  private String keyword;
  private Long departmentId;
  private Long shiftId;
  private String status;
  private String startDate;
  private String endDate;
  private Long employeeId;

  @Builder.Default
  private int page = 0;

  @Builder.Default
  private int size = 20;
}
