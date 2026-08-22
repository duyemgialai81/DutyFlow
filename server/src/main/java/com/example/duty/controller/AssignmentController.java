package com.example.duty.controller;

import com.example.duty.dto.ApiResponse;
import com.example.duty.dto.DutyDtos;
import com.example.duty.service.AssignmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class AssignmentController {

  private final AssignmentService service;

  @PostMapping("/api/duty-schedules/{scheduleId}/assignments")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<DutyDtos.ScheduleResponse> add(@PathVariable Long scheduleId,
                                                    @Valid @RequestBody DutyDtos.AssignEmployeeRequest req) {
    return ApiResponse.ok("Đã thêm nhân viên — đang gửi thông báo Zalo.", service.add(scheduleId, req.employeeId()));
  }

  @PutMapping("/api/duty-schedules/{scheduleId}/assignments/{assignmentId}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<DutyDtos.ScheduleResponse> replace(@PathVariable Long scheduleId,
                                                        @PathVariable Long assignmentId,
                                                        @Valid @RequestBody DutyDtos.AssignEmployeeRequest req) {
    return ApiResponse.ok("Đã đổi người trực.", service.replace(scheduleId, assignmentId, req.employeeId()));
  }

  @DeleteMapping("/api/duty-schedules/{scheduleId}/assignments/{assignmentId}")
  @PreAuthorize("hasRole('ADMIN')")
  public ApiResponse<DutyDtos.ScheduleResponse> remove(@PathVariable Long scheduleId,
                                                       @PathVariable Long assignmentId) {
    return ApiResponse.ok("Đã gỡ nhân viên.", service.remove(scheduleId, assignmentId));
  }

  @PostMapping("/api/duty-schedules/{scheduleId}/assignments/{assignmentId}/confirm")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<DutyDtos.ScheduleResponse> confirm(@PathVariable Long scheduleId,
                                                        @PathVariable Long assignmentId) {
    return ApiResponse.ok("Đã xác nhận ca trực.", service.respond(scheduleId, assignmentId, true));
  }

  @PostMapping("/api/duty-schedules/{scheduleId}/assignments/{assignmentId}/decline")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<DutyDtos.ScheduleResponse> decline(@PathVariable Long scheduleId,
                                                        @PathVariable Long assignmentId) {
    return ApiResponse.ok("Đã từ chối ca trực.", service.respond(scheduleId, assignmentId, false));
  }

  @GetMapping("/api/duty-schedules/my-calendar")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<List<DutyDtos.MyDutyItem>> myCalendar(
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
    return ApiResponse.ok(service.myCalendar(from, to));
  }
}
