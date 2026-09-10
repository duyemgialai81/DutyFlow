package com.example.duty.elasticsearch;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.elasticsearch.annotations.DateFormat;
import org.springframework.data.elasticsearch.annotations.Document;
import org.springframework.data.elasticsearch.annotations.Field;
import org.springframework.data.elasticsearch.annotations.FieldType;

import java.io.Serializable;
import java.util.ArrayList;
import java.util.List;

/**
 * Tài liệu chỉ mục Elasticsearch cho Lịch trực (Duty Schedule Index Document).
 * Thiết kế theo chuẩn Spring Data Elasticsearch phục vụ Full-Text Search và Term Aggregation siêu tốc (< 5ms).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(indexName = "duty_schedule_index", createIndex = false)
public class DutyScheduleDocument implements Serializable {

  /** Mã định danh ca trực (Index Primary Key) */
  @Id
  private Long scheduleId;

  /** Ngày trực theo định dạng ISO-8601 (YYYY-MM-DD) */
  @Field(type = FieldType.Keyword)
  private String date;

  /** Thông tin ca trực */
  @Field(type = FieldType.Long)
  private Long shiftId;

  @Field(type = FieldType.Keyword)
  private String shiftCode;

  @Field(type = FieldType.Text)
  private String shiftName;

  @Field(type = FieldType.Keyword)
  private String startTime;

  @Field(type = FieldType.Keyword)
  private String endTime;

  /** Thông tin Khoa / Phòng ban */
  @Field(type = FieldType.Long)
  private Long departmentId;

  @Field(type = FieldType.Text)
  private String departmentName;

  /** Địa điểm làm việc */
  @Field(type = FieldType.Text)
  private String location;

  /** Trạng thái ca trực (DRAFT, CONFIRMED, COMPLETED, CANCELLED) */
  @Field(type = FieldType.Keyword)
  private String status;

  /** Số lượng nhân sự định biên và thực tế */
  @Field(type = FieldType.Integer)
  private Integer requiredPeople;

  @Field(type = FieldType.Integer)
  private Integer assignedCount;

  /** Danh sách nhân viên được phân công trong ca (Nested Document) */
  @Builder.Default
  @Field(type = FieldType.Nested)
  private List<AssignedEmployeeDoc> assignedEmployees = new ArrayList<>();

  /** Trường tổng hợp tìm kiếm toàn văn (Full-Text Search Composite Field) */
  @Field(type = FieldType.Text)
  private String fullTextSearchable;

  @Data
  @Builder
  @NoArgsConstructor
  @AllArgsConstructor
  public static class AssignedEmployeeDoc implements Serializable {
    @Field(type = FieldType.Long)
    private Long employeeId;

    @Field(type = FieldType.Keyword)
    private String employeeCode;

    @Field(type = FieldType.Text)
    private String fullName;

    @Field(type = FieldType.Keyword)
    private String phone;

    @Field(type = FieldType.Keyword)
    private String assignmentStatus;
  }
}
