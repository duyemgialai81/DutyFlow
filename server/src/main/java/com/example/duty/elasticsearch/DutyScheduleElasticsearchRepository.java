package com.example.duty.elasticsearch;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.elasticsearch.repository.ElasticsearchRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data Elasticsearch Repository cho DutyScheduleDocument.
 * Kế thừa chuẩn ElasticsearchRepository cung cấp các thao tác CRUD và tra cứu phân trang trên Index.
 */
@Repository
public interface DutyScheduleElasticsearchRepository extends ElasticsearchRepository<DutyScheduleDocument, Long> {

  /** Lọc theo Khoa / Phòng ban có phân trang */
  Page<DutyScheduleDocument> findByDepartmentId(Long departmentId, Pageable pageable);

  /** Lọc theo Trạng thái ca trực có phân trang */
  Page<DutyScheduleDocument> findByStatus(String status, Pageable pageable);

  /** Lọc theo khoảng ngày trực (Date Range) */
  List<DutyScheduleDocument> findByDateBetween(String startDate, String endDate);

  /** Lọc theo Ca trực chỉ định */
  Page<DutyScheduleDocument> findByShiftId(Long shiftId, Pageable pageable);
}
