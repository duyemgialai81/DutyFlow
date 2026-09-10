package com.example.duty.controller;

import com.example.duty.dto.ApiResponse;
import com.example.duty.dto.DutyDtos;
import com.example.duty.dto.PageResponse;
import com.example.duty.elasticsearch.DutyScheduleDocument;
import com.example.duty.elasticsearch.ScheduleSearchCriteria;
import com.example.duty.elasticsearch.ScheduleSearchIndexService;
import com.example.duty.service.AssignmentService;
import com.example.duty.service.DutyScheduleService;
import com.example.duty.util.SecurityUsers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Hệ thống Controller chuẩn doanh nghiệp phân cấp bậc thẩm quyền (Enterprise Tiered RBAC API):
 * - Cấp 1: ADMIN (Toàn quyền hệ thống, quản trị chỉ mục Elasticsearch, xem toàn viện)
 * - Cấp 2: LEADER (Quản trị ca trực trong phạm vi Khoa/Phòng phụ trách)
 * - Cấp 3: EMPLOYEE (Tác vụ cá nhân, tìm kiếm lịch của chính mình, xác nhận ca)
 */
@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class EnterpriseTieredScheduleController {

  private final ScheduleSearchIndexService searchIndexService;
  private final DutyScheduleService dutyScheduleService;
  private final AssignmentService assignmentService;

  /* =========================================================================
   * CẤP BẬC 1: ADMIN (Quản trị viên toàn hệ thống)
   * ========================================================================= */

  /** 1.1 Tra cứu & Tìm kiếm siêu tốc lịch trực toàn viện qua Elasticsearch Index */
  @GetMapping("/admin/schedules/search")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<PageResponse<DutyScheduleDocument>> adminSearch(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) Long departmentId,
      @RequestParam(required = false) Long shiftId,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String startDate,
      @RequestParam(required = false) String endDate,
      @RequestParam(required = false) Long employeeId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size
  ) {
    ScheduleSearchCriteria criteria = ScheduleSearchCriteria.builder()
        .keyword(keyword)
        .departmentId(departmentId)
        .shiftId(shiftId)
        .status(status)
        .startDate(startDate)
        .endDate(endDate)
        .employeeId(employeeId)
        .page(page)
        .size(size)
        .build();

    PageResponse<DutyScheduleDocument> result = searchIndexService.search(criteria);
    return ApiResponse.ok("Tìm kiếm ca trực toàn viện thành công.", result);
  }

  /** 1.2 Tái tạo & đồng bộ chỉ mục Elasticsearch toàn viện */
  @PostMapping("/admin/schedules/reindex")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<Void> adminReindex() {
    searchIndexService.initFullIndex();
    return ApiResponse.ok("Đã tái tạo và đồng bộ chỉ mục toàn hệ thống thành công.", null);
  }

  /** 1.3 Giám sát trạng thái chỉ mục & tài nguyên hệ thống */
  @GetMapping("/admin/system/metrics")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<Map<String, Object>> adminSystemMetrics() {
    Runtime rt = Runtime.getRuntime();
    Map<String, Object> metrics = new HashMap<>();
    metrics.put("status", "UP");
    metrics.put("totalMemoryMb", rt.totalMemory() / (1024 * 1024));
    metrics.put("freeMemoryMb", rt.freeMemory() / (1024 * 1024));
    metrics.put("maxMemoryMb", rt.maxMemory() / (1024 * 1024));
    metrics.put("availableProcessors", rt.availableProcessors());
    metrics.put("timestamp", java.time.LocalDateTime.now());
    return ApiResponse.ok("Lấy chỉ số vận hành hệ thống thành công.", metrics);
  }

  /* =========================================================================
   * CẤP BẬC 2: LEADER (Tổ trưởng / Trưởng khoa)
   * ========================================================================= */

  /** 2.1 Xem lịch trực cấp Khoa phòng (Bảo mật: Chỉ xem khoa mình phụ trách) */
  @GetMapping("/leader/departments/{departmentId}/schedules")
  @PreAuthorize("hasRole('ADMIN') or (hasRole('LEADER') and @deptSecurity.isLeaderOf(#departmentId))")
  public ApiResponse<DutyDtos.CalendarResponse> leaderGetDepartmentCalendar(
      @PathVariable Long departmentId,
      @RequestParam String month,
      @RequestParam(required = false) Long shiftId,
      @RequestParam(required = false) String status
  ) {
    DutyDtos.CalendarResponse res = dutyScheduleService.calendar(month, departmentId, shiftId, status, null);
    return ApiResponse.ok("Lấy lịch trực khoa phòng thành công.", res);
  }

  /** 2.2 Tìm kiếm siêu tốc ca trực trong phạm vi Khoa phòng phụ trách */
  @GetMapping("/leader/departments/{departmentId}/schedules/search")
  @PreAuthorize("hasRole('ADMIN') or (hasRole('LEADER') and @deptSecurity.isLeaderOf(#departmentId))")
  public ApiResponse<PageResponse<DutyScheduleDocument>> leaderSearchDepartment(
      @PathVariable Long departmentId,
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) Long shiftId,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String startDate,
      @RequestParam(required = false) String endDate,
      @RequestParam(required = false) Long employeeId,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size
  ) {
    ScheduleSearchCriteria criteria = ScheduleSearchCriteria.builder()
        .keyword(keyword)
        .departmentId(departmentId) // Cố định chỉ tìm trong khoa của Leader
        .shiftId(shiftId)
        .status(status)
        .startDate(startDate)
        .endDate(endDate)
        .employeeId(employeeId)
        .page(page)
        .size(size)
        .build();

    PageResponse<DutyScheduleDocument> result = searchIndexService.search(criteria);
    return ApiResponse.ok("Tìm kiếm ca trực khoa phòng thành công.", result);
  }

  /* =========================================================================
   * CẤP BẬC 3: EMPLOYEE (Nhân viên / Bác sĩ / Điều dưỡng)
   * ========================================================================= */

  /** 3.1 Xem lịch trực cá nhân của chính mình */
  @GetMapping("/employee/me/schedules")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<List<DutyDtos.MyDutyItem>> employeeGetMySchedules(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
  ) {
    Long myEmployeeId = SecurityUsers.currentEmployeeId();
    List<DutyDtos.MyDutyItem> items = assignmentService.myDutyItems(from, to, myEmployeeId);
    return ApiResponse.ok("Lấy lịch trực cá nhân thành công.", items);
  }

  /** 3.2 Tìm kiếm siêu tốc lịch trực cá nhân qua Index */
  @GetMapping("/employee/me/schedules/search")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<PageResponse<DutyScheduleDocument>> employeeSearchMySchedules(
      @RequestParam(required = false) String keyword,
      @RequestParam(required = false) String status,
      @RequestParam(required = false) String startDate,
      @RequestParam(required = false) String endDate,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "20") int size
  ) {
    Long myEmployeeId = SecurityUsers.currentEmployeeId();
    ScheduleSearchCriteria criteria = ScheduleSearchCriteria.builder()
        .keyword(keyword)
        .employeeId(myEmployeeId) // Cố định chỉ tìm ca của chính nhân viên này
        .status(status)
        .startDate(startDate)
        .endDate(endDate)
        .page(page)
        .size(size)
        .build();

    PageResponse<DutyScheduleDocument> result = searchIndexService.search(criteria);
    return ApiResponse.ok("Tìm kiếm lịch trực cá nhân thành công.", result);
  }

  /** 3.3 Nhân viên xác nhận đã nhận ca trực cá nhân */
  @PostMapping("/employee/me/schedules/{scheduleId}/assignments/{assignmentId}/confirm")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<DutyDtos.ScheduleResponse> employeeConfirmAssignment(
      @PathVariable Long scheduleId,
      @PathVariable Long assignmentId
  ) {
    DutyDtos.ScheduleResponse res = assignmentService.respond(scheduleId, assignmentId, true);
    return ApiResponse.ok("Đã xác nhận ca trực cá nhân.", res);
  }
}
