package com.example.duty.controller;

import com.example.duty.dto.ApiResponse;
import com.example.duty.dto.AutoAssignDtos.*;
import com.example.duty.dto.DutyDtos;
import com.example.duty.service.DutyScheduleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/duty-schedules")
@RequiredArgsConstructor
public class DutyScheduleController {

  private final DutyScheduleService service;

  /* ---------- Schedule CRUD + transitions ---------- */

  @PostMapping
  @PreAuthorize("hasAnyRole('ADMIN','LEADER')")
  public ApiResponse<DutyDtos.ScheduleResponse> create(@Valid @RequestBody DutyDtos.CreateScheduleRequest req) {
    return ApiResponse.ok("Đã tạo ca trực.", service.create(req));
  }

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<DutyDtos.CalendarResponse> list(@RequestParam String month,
                                                     @RequestParam(required = false) Long departmentId,
                                                     @RequestParam(required = false) Long shiftId,
                                                     @RequestParam(required = false) String status,
                                                     @RequestParam(required = false) Long employeeId) {
    return ApiResponse.ok(service.calendar(month, departmentId, shiftId, status, employeeId));
  }

  @GetMapping("/{id}")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<DutyDtos.ScheduleDetailResponse> detail(@PathVariable Long id) {
    return ApiResponse.ok(service.detail(id));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','LEADER')")
  public ApiResponse<DutyDtos.ScheduleResponse> update(@PathVariable Long id,
                                                       @Valid @RequestBody DutyDtos.UpdateScheduleRequest req) {
    return ApiResponse.ok("Đã cập nhật ca trực.", service.update(id, req));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','LEADER')")
  public ApiResponse<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return ApiResponse.ok("Đã xóa ca trực nháp.", null);
  }

  @PostMapping("/{id}/confirm")
  @PreAuthorize("hasAnyRole('ADMIN','LEADER')")
  public ApiResponse<DutyDtos.ScheduleResponse> confirm(@PathVariable Long id) {
    return ApiResponse.ok("Đã xác nhận ca trực.", service.confirm(id));
  }

  @PostMapping("/{id}/lock")
  @PreAuthorize("hasAnyRole('ADMIN','LEADER')")
  public ApiResponse<DutyDtos.ScheduleResponse> lock(@PathVariable Long id) {
    return ApiResponse.ok("Đã khóa ca trực.", service.lock(id));
  }

  @PostMapping("/{id}/cancel")
  @PreAuthorize("hasAnyRole('ADMIN','LEADER')")
  public ApiResponse<DutyDtos.ScheduleResponse> cancel(@PathVariable Long id) {
    return ApiResponse.ok("Đã hủy ca trực.", service.cancel(id));
  }

  /* ---------- Auto assignment ---------- */

  @PostMapping("/auto-assign/preview")
  @PreAuthorize("hasAnyRole('ADMIN','LEADER')")
  public ApiResponse<AutoAssignPreviewResponse> preview(@Valid @RequestBody AutoAssignRequest req) {
    return ApiResponse.ok(service.preview(req));
  }

  @PostMapping("/auto-assign/confirm")
  @PreAuthorize("hasAnyRole('ADMIN','LEADER')")
  public ApiResponse<AutoAssignConfirmResponse> confirmAutoAssign(@Valid @RequestBody AutoAssignRequest req) {
    return ApiResponse.ok("Đã lưu phân ca tự động.", service.confirmAutoAssign(req));
  }

  /* ---------- Calendar ---------- */

  @GetMapping("/calendar")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<DutyDtos.CalendarResponse> calendar(@RequestParam String month,
                                                         @RequestParam(required = false) Long departmentId,
                                                         @RequestParam(required = false) Long shiftId,
                                                         @RequestParam(required = false) String status,
                                                         @RequestParam(required = false) Long employeeId) {
    return ApiResponse.ok(service.calendar(month, departmentId, shiftId, status, employeeId));
  }
}
