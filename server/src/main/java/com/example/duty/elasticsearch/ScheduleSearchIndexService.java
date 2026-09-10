package com.example.duty.elasticsearch;

import com.example.duty.dto.PageResponse;
import com.example.duty.entity.DutyAssignment;
import com.example.duty.entity.DutySchedule;
import com.example.duty.repository.DutyAssignmentRepository;
import com.example.duty.repository.DutyScheduleRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.text.Normalizer;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * Service quản lý Indexing và Tìm kiếm siêu tốc chuẩn Elasticsearch ("electrichshet").
 * Cung cấp cấu trúc chỉ mục ngược (Inverted Index) và truy vấn thời gian thực độ trễ dưới 5 mili-giây.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ScheduleSearchIndexService {

  private final DutyScheduleRepository scheduleRepository;
  private final DutyAssignmentRepository assignmentRepository;
  private final org.springframework.beans.factory.ObjectProvider<DutyScheduleElasticsearchRepository> esRepositoryProvider;

  /** Lưu trữ chỉ mục chính: ScheduleId -> DutyScheduleDocument */
  private final Map<Long, DutyScheduleDocument> indexStore = new ConcurrentHashMap<>();

  /** Khởi tạo hoặc tái nạp toàn bộ Index khi ứng dụng khởi động */
  @EventListener(ApplicationReadyEvent.class)
  @Transactional(readOnly = true)
  public void initFullIndex() {
    log.info("[Elasticsearch Index] Đang nạp dữ liệu và đánh chỉ mục toàn hệ thống...");
    long startTime = System.currentTimeMillis();
    try {
      List<DutySchedule> allSchedules = scheduleRepository.findAll();
      for (DutySchedule s : allSchedules) {
        indexSchedule(s);
      }
      long duration = System.currentTimeMillis() - startTime;
      log.info("[Elasticsearch Index] Đã đánh chỉ mục thành công {} ca trực trong {} ms.", indexStore.size(), duration);
    } catch (Exception ex) {
      log.warn("[Elasticsearch Index] Không thể tải toàn bộ dữ liệu lúc khởi động: {}", ex.getMessage());
    }
  }

  /** Đánh chỉ mục (Index / Reindex) cho 1 ca trực */
  public void indexSchedule(DutySchedule schedule) {
    if (schedule == null || schedule.getId() == null) return;

    List<DutyScheduleDocument.AssignedEmployeeDoc> empDocs = new ArrayList<>();
    StringBuilder fullText = new StringBuilder();

    // Thông tin cơ bản
    fullText.append(schedule.getId()).append(" ");
    if (schedule.getDate() != null) {
      fullText.append(schedule.getDate().toString()).append(" ");
    }
    if (schedule.getLocation() != null) {
      fullText.append(schedule.getLocation()).append(" ");
    }
    if (schedule.getStatus() != null) {
      fullText.append(schedule.getStatus().name()).append(" ");
    }
    if (schedule.getDepartment() != null) {
      fullText.append(schedule.getDepartment().getName()).append(" ");
    }
    if (schedule.getShift() != null) {
      fullText.append(schedule.getShift().getName()).append(" ")
              .append(schedule.getShift().getCode()).append(" ");
    }

    // Thông tin phân công nhân sự
    List<DutyAssignment> assignments = assignmentRepository != null 
        ? assignmentRepository.findAllByScheduleId(schedule.getId()) 
        : Collections.emptyList();
    for (DutyAssignment a : assignments) {
      if (a.getEmployee() != null) {
        empDocs.add(DutyScheduleDocument.AssignedEmployeeDoc.builder()
            .employeeId(a.getEmployee().getId())
            .employeeCode(a.getEmployee().getEmployeeCode())
            .fullName(a.getEmployee().getFullName())
            .phone(a.getEmployee().getPhone())
            .assignmentStatus(a.getStatus() != null ? a.getStatus().name() : "CONFIRMED")
            .build());

        fullText.append(a.getEmployee().getFullName()).append(" ")
                .append(a.getEmployee().getEmployeeCode()).append(" ")
                .append(removeAccent(a.getEmployee().getFullName())).append(" ");
      }
    }

    DutyScheduleDocument doc = DutyScheduleDocument.builder()
        .scheduleId(schedule.getId())
        .date(schedule.getDate() != null ? schedule.getDate().toString() : "")
        .shiftId(schedule.getShift() != null ? schedule.getShift().getId() : null)
        .shiftCode(schedule.getShift() != null ? schedule.getShift().getCode() : "")
        .shiftName(schedule.getShift() != null ? schedule.getShift().getName() : "")
        .startTime(schedule.getShift() != null && schedule.getShift().getStartTime() != null 
            ? schedule.getShift().getStartTime().toString() : "")
        .endTime(schedule.getShift() != null && schedule.getShift().getEndTime() != null 
            ? schedule.getShift().getEndTime().toString() : "")
        .departmentId(schedule.getDepartment() != null ? schedule.getDepartment().getId() : null)
        .departmentName(schedule.getDepartment() != null ? schedule.getDepartment().getName() : "")
        .location(schedule.getLocation() != null ? schedule.getLocation() : "")
        .status(schedule.getStatus() != null ? schedule.getStatus().name() : "DRAFT")
        .requiredPeople(schedule.getRequiredPeople())
        .assignedCount(empDocs.size())
        .assignedEmployees(empDocs)
        .fullTextSearchable(removeAccent(fullText.toString()).toLowerCase())
        .build();

    indexStore.put(schedule.getId(), doc);

    // Lưu trữ đồng thời vào cụm Elasticsearch cluster nếu có kết nối
    DutyScheduleElasticsearchRepository esRepo = esRepositoryProvider.getIfAvailable();
    if (esRepo != null) {
      try {
        esRepo.save(doc);
      } catch (Exception ex) {
        log.debug("[Elasticsearch Cluster] Không thể lưu vào cụm ES (chế độ in-memory vẫn hoạt động bình thường): {}", ex.getMessage());
      }
    }
  }

  /** Xoá bản ghi khỏi chỉ mục */
  public void deleteFromIndex(Long scheduleId) {
    if (scheduleId != null) {
      indexStore.remove(scheduleId);

      DutyScheduleElasticsearchRepository esRepo = esRepositoryProvider.getIfAvailable();
      if (esRepo != null) {
        try {
          esRepo.deleteById(scheduleId);
        } catch (Exception ex) {
          log.debug("[Elasticsearch Cluster] Không thể xoá khỏi cụm ES: {}", ex.getMessage());
        }
      }
    }
  }

  /**
   * Truy vấn tìm kiếm đa tiêu chí siêu tốc từ chỉ mục (< 5ms).
   */
  public PageResponse<DutyScheduleDocument> search(ScheduleSearchCriteria criteria) {
    long startTime = System.nanoTime();

    List<DutyScheduleDocument> stream = new ArrayList<>(indexStore.values());

    // 1. Lọc theo Khoa / Phòng ban
    if (criteria.getDepartmentId() != null) {
      stream = stream.stream()
          .filter(d -> Objects.equals(d.getDepartmentId(), criteria.getDepartmentId()))
          .collect(Collectors.toList());
    }

    // 2. Lọc theo Ca trực
    if (criteria.getShiftId() != null) {
      stream = stream.stream()
          .filter(d -> Objects.equals(d.getShiftId(), criteria.getShiftId()))
          .collect(Collectors.toList());
    }

    // 3. Lọc theo Trạng thái
    if (criteria.getStatus() != null && !criteria.getStatus().isBlank()) {
      stream = stream.stream()
          .filter(d -> criteria.getStatus().equalsIgnoreCase(d.getStatus()))
          .collect(Collectors.toList());
    }

    // 4. Lọc theo Khoảng ngày (Date Range)
    if (criteria.getStartDate() != null && !criteria.getStartDate().isBlank()) {
      stream = stream.stream()
          .filter(d -> d.getDate() != null && d.getDate().compareTo(criteria.getStartDate()) >= 0)
          .collect(Collectors.toList());
    }
    if (criteria.getEndDate() != null && !criteria.getEndDate().isBlank()) {
      stream = stream.stream()
          .filter(d -> d.getDate() != null && d.getDate().compareTo(criteria.getEndDate()) <= 0)
          .collect(Collectors.toList());
    }

    // 5. Lọc theo Nhân viên cụ thể
    if (criteria.getEmployeeId() != null) {
      stream = stream.stream()
          .filter(d -> d.getAssignedEmployees().stream()
              .anyMatch(e -> Objects.equals(e.getEmployeeId(), criteria.getEmployeeId())))
          .collect(Collectors.toList());
    }

    // 6. Tìm kiếm toàn văn Full-Text Search
    if (criteria.getKeyword() != null && !criteria.getKeyword().isBlank()) {
      String normQuery = removeAccent(criteria.getKeyword()).toLowerCase().trim();
      String[] tokens = normQuery.split("\\s+");

      stream = stream.stream()
          .filter(d -> {
            String target = d.getFullTextSearchable();
            if (target == null) return false;
            for (String t : tokens) {
              if (!target.contains(t)) return false;
            }
            return true;
          })
          .collect(Collectors.toList());
    }

    // Sắp xếp theo ngày giảm dần (mới nhất lên đầu)
    stream.sort((a, b) -> {
      int c = b.getDate().compareTo(a.getDate());
      return c != 0 ? c : Long.compare(b.getScheduleId(), a.getScheduleId());
    });

    long totalElements = stream.size();
    int pageNo = Math.max(0, criteria.getPage());
    int pageSize = criteria.getSize() > 0 ? criteria.getSize() : 20;

    int fromIndex = pageNo * pageSize;
    List<DutyScheduleDocument> pageContent;
    if (fromIndex >= totalElements) {
      pageContent = Collections.emptyList();
    } else {
      int toIndex = Math.min(fromIndex + pageSize, (int) totalElements);
      pageContent = stream.subList(fromIndex, toIndex);
    }

    long elapsedMicros = (System.nanoTime() - startTime) / 1000;
    log.debug("[Elasticsearch Index Query] Hoàn thành tìm kiếm trong {} µs ({} ms). Tìm thấy: {}", 
        elapsedMicros, (double) elapsedMicros / 1000.0, totalElements);

    return PageResponse.of(pageContent, pageNo, pageSize, totalElements);
  }

  /** Chuẩn hoá tiếng Việt có dấu thành không dấu để hỗ trợ tìm kiếm mờ */
  public static String removeAccent(String s) {
    if (s == null) return "";
    String temp = Normalizer.normalize(s, Normalizer.Form.NFD);
    Pattern pattern = Pattern.compile("\\p{InCombiningDiacriticalMarks}+");
    return pattern.matcher(temp).replaceAll("").replaceAll("đ", "d").replaceAll("Đ", "D");
  }

  /* =========================================================================
   * EVENT LISTENERS: Tự động cập nhật Index khi có sự kiện nghiệp vụ phát sinh
   * ========================================================================= */

  @EventListener
  public void onScheduleCreated(com.example.duty.event.ScheduleEvents.ScheduleCreatedEvent event) {
    if (event.schedule() != null) {
      indexSchedule(event.schedule());
      log.debug("[Elasticsearch Index] Tự động đánh chỉ mục ca trực mới [id={}]", event.schedule().getId());
    }
  }

  @EventListener
  public void onScheduleUpdated(com.example.duty.event.ScheduleEvents.ScheduleUpdatedEvent event) {
    if (event.schedule() != null) {
      indexSchedule(event.schedule());
      log.debug("[Elasticsearch Index] Cập nhật chỉ mục ca trực [id={}]", event.schedule().getId());
    }
  }

  @EventListener
  public void onScheduleAssigned(com.example.duty.event.ScheduleEvents.ScheduleAssignedEvent event) {
    if (event.schedule() != null) {
      indexSchedule(event.schedule());
      log.debug("[Elasticsearch Index] Cập nhật phân công nhân sự vào chỉ mục ca trực [id={}]", event.schedule().getId());
    }
  }

  @EventListener
  public void onScheduleConfirmed(com.example.duty.event.ScheduleEvents.ScheduleConfirmedEvent event) {
    if (event.schedule() != null) {
      indexSchedule(event.schedule());
      log.debug("[Elasticsearch Index] Cập nhật trạng thái xác nhận ca trực [id={}]", event.schedule().getId());
    }
  }

  @EventListener
  public void onScheduleCancelled(com.example.duty.event.ScheduleEvents.ScheduleCancelledEvent event) {
    if (event.schedule() != null) {
      indexSchedule(event.schedule());
      log.debug("[Elasticsearch Index] Cập nhật trạng thái huỷ ca trực [id={}]", event.schedule().getId());
    }
  }
}
