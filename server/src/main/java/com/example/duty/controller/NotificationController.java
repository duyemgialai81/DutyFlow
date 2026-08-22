package com.example.duty.controller;

import com.example.duty.dto.ApiResponse;
import com.example.duty.dto.MiscDtos.NotificationResponse;
import com.example.duty.dto.MiscDtos.UnreadCountResponse;
import com.example.duty.notification.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

  private final NotificationService service;

  @GetMapping
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<List<NotificationResponse>> list(@RequestParam(defaultValue = "false") boolean all) {
    return ApiResponse.ok(service.list(all));
  }

  @GetMapping("/unread-count")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<UnreadCountResponse> unread() {
    return ApiResponse.ok(new UnreadCountResponse(service.unreadCount()));
  }

  @PutMapping("/{id}/read")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<Void> markRead(@PathVariable Long id) {
    service.markRead(id);
    return ApiResponse.ok(null);
  }

  @PutMapping("/read-all")
  @PreAuthorize("isAuthenticated()")
  public ApiResponse<Void> markAllRead() {
    service.markAllRead();
    return ApiResponse.ok(null);
  }
}
