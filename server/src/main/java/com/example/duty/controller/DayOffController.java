package com.example.duty.controller;

import com.example.duty.dto.ApiResponse;
import com.example.duty.dto.MiscDtos;
import com.example.duty.entity.DayOff;
import com.example.duty.service.DayOffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/day-offs")
@RequiredArgsConstructor
public class DayOffController {

  private final DayOffService service;

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<List<MiscDtos.DayOffResponse>> list() {
    return ApiResponse.ok(service.list());
  }

  @PostMapping
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<MiscDtos.DayOffResponse> create(@Valid @RequestBody MiscDtos.DayOffRequest req) {
    return ApiResponse.ok("Đã gửi đăng ký nghỉ.", service.create(req));
  }

  @PutMapping("/{id}")
  @PreAuthorize("hasAnyRole('ADMIN','LEADER')")
  public ApiResponse<MiscDtos.DayOffResponse> update(@PathVariable Long id,
                                                     @Valid @RequestBody MiscDtos.DayOffStatusRequest req) {
    return ApiResponse.ok(service.updateStatus(id, req.status()));
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<Void> delete(@PathVariable Long id) {
    service.delete(id);
    return ApiResponse.ok("Đã xóa đăng ký nghỉ.", null);
  }
}
