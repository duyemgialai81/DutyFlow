package com.example.duty.controller;

import com.example.duty.dto.ApiResponse;
import com.example.duty.entity.DutyAssignment;
import com.example.duty.entity.Employee;
import com.example.duty.entity.SwapRequest;
import com.example.duty.exception.ApiException;
import com.example.duty.exception.ErrorCode;
import com.example.duty.repository.DutyAssignmentRepository;
import com.example.duty.repository.EmployeeRepository;
import com.example.duty.repository.SwapRequestRepository;
import com.example.duty.util.SecurityUsers;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * Controller quản lý yêu cầu đổi ca trực chuẩn Enterprise Envelope (ApiResponse).
 * Dữ liệu truy vấn trực tiếp từ bảng swap_request trong cơ sở dữ liệu SQL.
 */
@RestController
@RequestMapping("/api/swap-requests")
@RequiredArgsConstructor
public class SwapRequestController {

    private final SwapRequestRepository swapRequestRepository;
    private final DutyAssignmentRepository assignmentRepository;
    private final EmployeeRepository employeeRepository;

    public record SwapRequestDto(
        Long id,
        Long scheduleId,
        Long assignmentId,
        Long employeeId,
        String employeeName,
        String departmentName,
        String reason,
        String status,
        String scheduleDate,
        String shiftName,
        String startTime,
        String endTime,
        String location,
        String createdAt
    ) {}

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional(readOnly = true)
    public ApiResponse<List<SwapRequestDto>> list() {
        List<SwapRequest> list;
        if (SecurityUsers.isAdmin() || SecurityUsers.isLeader()) {
            list = swapRequestRepository.findAllWithDetails();
        } else {
            Long empId = SecurityUsers.currentEmployeeId();
            list = (empId != null)
                ? swapRequestRepository.findAllByEmployeeIdWithDetails(empId)
                : swapRequestRepository.findAllWithDetails();
        }

        List<SwapRequestDto> dtos = list.stream().map(r -> new SwapRequestDto(
            r.getId(),
            r.getAssignment().getSchedule().getId(),
            r.getAssignment().getId(),
            r.getEmployee().getId(),
            r.getEmployee().getFullName(),
            r.getEmployee().getDepartment() != null ? r.getEmployee().getDepartment().getName() : null,
            r.getReason(),
            r.getStatus().name(),
            r.getAssignment().getSchedule().getDate().toString(),
            r.getAssignment().getSchedule().getShift().getName(),
            r.getAssignment().getSchedule().getShift().getStartTime().toString(),
            r.getAssignment().getSchedule().getShift().getEndTime().toString(),
            r.getAssignment().getSchedule().getLocation(),
            r.getCreatedAt() != null ? r.getCreatedAt().toString() : java.time.Instant.now().toString()
        )).toList();

        return ApiResponse.ok("Lấy danh sách yêu cầu đổi ca thành công.", dtos);
    }

    public record CreateSwapRequest(Long assignmentId, String reason) {}

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ApiResponse<SwapRequestDto> create(@RequestBody CreateSwapRequest req) {
        DutyAssignment assignment = assignmentRepository.findById(req.assignmentId())
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy phân công ca trực."));

        Long empId = SecurityUsers.currentEmployeeId();
        Employee employee = (empId != null)
            ? employeeRepository.findById(empId).orElse(assignment.getEmployee())
            : assignment.getEmployee();

        SwapRequest sr = new SwapRequest();
        sr.setAssignment(assignment);
        sr.setEmployee(employee);
        sr.setReason(req.reason() != null ? req.reason() : "Xin đổi ca trực");
        sr.setStatus(SwapRequest.Status.PENDING);
        SwapRequest saved = swapRequestRepository.save(sr);

        SwapRequestDto dto = new SwapRequestDto(
            saved.getId(),
            assignment.getSchedule().getId(),
            assignment.getId(),
            employee.getId(),
            employee.getFullName(),
            employee.getDepartment() != null ? employee.getDepartment().getName() : null,
            saved.getReason(),
            saved.getStatus().name(),
            assignment.getSchedule().getDate().toString(),
            assignment.getSchedule().getShift().getName(),
            assignment.getSchedule().getShift().getStartTime().toString(),
            assignment.getSchedule().getShift().getEndTime().toString(),
            assignment.getSchedule().getLocation(),
            saved.getCreatedAt() != null ? saved.getCreatedAt().toString() : java.time.Instant.now().toString()
        );

        return ApiResponse.ok("Đã gửi yêu cầu đổi ca thành công.", dto);
    }

    @PutMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @Transactional
    public ApiResponse<SwapRequestDto> updateStatus(@PathVariable Long id, @RequestBody Map<String, String> body) {
        SwapRequest sr = swapRequestRepository.findById(id)
            .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy yêu cầu đổi ca."));

        String statusStr = body.get("status");
        if (statusStr != null) {
            sr.setStatus(SwapRequest.Status.valueOf(statusStr.toUpperCase()));
            swapRequestRepository.save(sr);
        }

        DutyAssignment assignment = sr.getAssignment();
        Employee employee = sr.getEmployee();

        SwapRequestDto dto = new SwapRequestDto(
            sr.getId(),
            assignment.getSchedule().getId(),
            assignment.getId(),
            employee.getId(),
            employee.getFullName(),
            employee.getDepartment() != null ? employee.getDepartment().getName() : null,
            sr.getReason(),
            sr.getStatus().name(),
            assignment.getSchedule().getDate().toString(),
            assignment.getSchedule().getShift().getName(),
            assignment.getSchedule().getShift().getStartTime().toString(),
            assignment.getSchedule().getShift().getEndTime().toString(),
            assignment.getSchedule().getLocation(),
            sr.getCreatedAt() != null ? sr.getCreatedAt().toString() : java.time.Instant.now().toString()
        );

        return ApiResponse.ok("Cập nhật trạng thái đổi ca thành công.", dto);
    }
}
