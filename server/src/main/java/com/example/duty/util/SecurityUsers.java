package com.example.duty.util;

import com.example.duty.exception.ApiException;
import com.example.duty.exception.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

/** Tiện ích đọc user hiện tại từ SecurityContext (set bởi JwtAuthFilter). */
public final class SecurityUsers {

  public static final String ROLE_ADMIN    = "ROLE_ADMIN";
  public static final String ROLE_LEADER   = "ROLE_LEADER";
  public static final String ROLE_EMPLOYEE = "ROLE_EMPLOYEE";

  private SecurityUsers() {}

  /** sub trong JWT — với module này sub = employeeCode hoặc \"admin\" */
  public static String currentSub() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth == null || auth.getName() == null) {
      throw new ApiException(ErrorCode.UNAUTHORIZED, "Chưa đăng nhập.");
    }
    return auth.getName();
  }

  public static String currentName() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof JwtPrincipal jp) return jp.displayName();
    return currentSub();
  }

  public static Long currentEmployeeId() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    if (auth != null && auth.getPrincipal() instanceof JwtPrincipal jp) return jp.employeeId();
    return null;
  }

  public static boolean isAdmin() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return auth != null && auth.getAuthorities().stream()
        .map(GrantedAuthority::getAuthority)
        .anyMatch(ROLE_ADMIN::equals);
  }

  public static boolean isLeader() {
    Authentication auth = SecurityContextHolder.getContext().getAuthentication();
    return auth != null && auth.getAuthorities().stream()
        .map(GrantedAuthority::getAuthority)
        .anyMatch(ROLE_LEADER::equals);
  }

  /** Admin HOẶC Leader — dùng cho các thao tác quản lý lịch trực. */
  public static boolean isAdminOrLeader() {
    return isAdmin() || isLeader();
  }

  public static void requireAdmin() {
    if (!isAdmin()) {
      throw new ApiException(ErrorCode.FORBIDDEN, "Bạn không có quyền thực hiện thao tác này.");
    }
  }

  public static void requireAdminOrLeader() {
    if (!isAdminOrLeader()) {
      throw new ApiException(ErrorCode.FORBIDDEN, "Chỉ Quản trị viên hoặc Tổ trưởng mới có quyền thực hiện thao tác này.");
    }
  }

  /** Principal tuỳ chỉnh nhét vào Authentication. */
  public record JwtPrincipal(String sub, Long employeeId, String displayName, String role) {}
}
