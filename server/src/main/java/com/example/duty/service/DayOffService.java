package com.example.duty.service;

import com.example.duty.dto.MiscDtos;
import com.example.duty.entity.DayOff;
import com.example.duty.entity.Employee;
import com.example.duty.exception.ApiException;
import com.example.duty.exception.ErrorCode;
import com.example.duty.mapper.DutyMapper;
import com.example.duty.repository.DayOffRepository;
import com.example.duty.repository.EmployeeRepository;
import com.example.duty.util.SecurityUsers;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DayOffService {

  private final DayOffRepository dayOffRepository;
  private final EmployeeRepository employeeRepository;
  private final DutyMapper mapper;

  @Transactional(readOnly = true)
  public List<MiscDtos.DayOffResponse> list() {
    Long me = SecurityUsers.currentEmployeeId();
    List<DayOff> all = SecurityUsers.isAdmin() || me == null
        ? dayOffRepository.findAll()
        : dayOffRepository.findAllByEmployeeId(me);
    return all.stream().sorted(Comparator.comparing(DayOff::getDate)).map(mapper::toDayOff).toList();
  }

  @Transactional
  public MiscDtos.DayOffResponse create(MiscDtos.DayOffRequest req) {
    Long employeeId = SecurityUsers.isAdmin() && req.employeeId() != null
        ? req.employeeId()
        : SecurityUsers.currentEmployeeId();
    if (employeeId == null) {
      throw new ApiException(ErrorCode.VALIDATION_ERROR, "Không xác định được nhân viên.");
    }
    if (dayOffRepository.existsByEmployeeIdAndDateAndStatusNot(employeeId, req.date(), DayOff.Status.REJECTED)) {
      throw new ApiException(ErrorCode.DAY_OFF_DUPLICATE, "Đã có đăng ký nghỉ ngày " + req.date() + ".");
    }
    Employee e = employeeRepository.findById(employeeId)
        .orElseThrow(() -> new ApiException(ErrorCode.EMPLOYEE_NOT_FOUND, "Không tìm thấy nhân viên."));
    DayOff d = new DayOff();
    d.setEmployee(e);
    d.setDate(req.date());
    d.setReason(req.reason().trim());
    d.setStatus(DayOff.Status.PENDING);
    return mapper.toDayOff(dayOffRepository.save(d));
  }

  @Transactional
  public MiscDtos.DayOffResponse updateStatus(Long id, DayOff.Status status) {
    SecurityUsers.requireAdmin();
    DayOff d = dayOffRepository.findById(id)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy đăng ký nghỉ."));
    d.setStatus(status);
    return mapper.toDayOff(dayOffRepository.save(d));
  }

  @Transactional
  public void delete(Long id) {
    DayOff d = dayOffRepository.findById(id)
        .orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "Không tìm thấy đăng ký nghỉ."));
    Long me = SecurityUsers.currentEmployeeId();
    if (!SecurityUsers.isAdmin() && (me == null || !me.equals(d.getEmployee().getId()))) {
      throw new ApiException(ErrorCode.FORBIDDEN, "Không có quyền xóa đăng ký này.");
    }
    dayOffRepository.delete(d);
  }
}
