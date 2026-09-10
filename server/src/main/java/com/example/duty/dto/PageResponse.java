package com.example.duty.dto;

import java.util.List;

/**
 * Phong bì phân trang chuẩn doanh nghiệp (Enterprise Standard Page Envelope).
 */
public record PageResponse<T>(
    List<T> content,
    int pageNo,
    int pageSize,
    long totalElements,
    int totalPages,
    boolean isFirst,
    boolean isLast
) {

  public static <T> PageResponse<T> of(List<T> content, int pageNo, int pageSize, long totalElements) {
    int totalPages = pageSize > 0 ? (int) Math.ceil((double) totalElements / pageSize) : 0;
    boolean isFirst = pageNo <= 0;
    boolean isLast = pageNo >= (totalPages - 1);
    return new PageResponse<>(content, pageNo, pageSize, totalElements, totalPages, isFirst, isLast);
  }
}
