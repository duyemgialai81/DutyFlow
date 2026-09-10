package com.example.duty.repository;

import com.example.duty.entity.DutyAssignment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;

public interface DutyAssignmentRepository extends JpaRepository<DutyAssignment, Long> {

  List<DutyAssignment> findAllByScheduleId(Long scheduleId);

  List<DutyAssignment> findAllByEmployeeIdAndStatusIn(Long employeeId, List<DutyAssignment.Status> statuses);

  @Query("""
      select a from DutyAssignment a join a.schedule s join s.shift sh
      where a.employee.id = :employeeId
        and a.status in (com.example.duty.entity.DutyAssignment.Status.ASSIGNED, com.example.duty.entity.DutyAssignment.Status.CONFIRMED)
        and s.status <> com.example.duty.entity.DutySchedule.Status.CANCELLED
        and s.date = :date
        and sh.startTime < :endTime and :startTime < sh.endTime
      """)
  List<DutyAssignment> findConflicting(@Param("employeeId") Long employeeId,
                                       @Param("date") LocalDate date,
                                       @Param("startTime") java.time.LocalTime startTime,
                                       @Param("endTime") java.time.LocalTime endTime);

  @Query("""
      select count(a) from DutyAssignment a join a.schedule s
      where a.employee.id = :employeeId
        and a.status in (com.example.duty.entity.DutyAssignment.Status.ASSIGNED, com.example.duty.entity.DutyAssignment.Status.CONFIRMED)
        and s.status <> com.example.duty.entity.DutySchedule.Status.CANCELLED
        and function('DATE_FORMAT', s.date, '%Y-%m') = :month
      """)
  long countByEmployeeAndMonth(@Param("employeeId") Long employeeId,
                               @Param("month") String month);

  @Query("""
      select a.employee.id, count(a) from DutyAssignment a join a.schedule s
      where a.status in (com.example.duty.entity.DutyAssignment.Status.ASSIGNED, com.example.duty.entity.DutyAssignment.Status.CONFIRMED)
        and s.status <> com.example.duty.entity.DutySchedule.Status.CANCELLED
        and s.date >= :from and s.date <= :to
      group by a.employee.id
      """)
  List<Object[]> countActiveByEmployeeBetween(@Param("from") LocalDate from, @Param("to") LocalDate to);

  @Query("""
      select count(a) from DutyAssignment a join a.schedule s
      where a.employee.id = :employeeId
        and a.status in (com.example.duty.entity.DutyAssignment.Status.ASSIGNED, com.example.duty.entity.DutyAssignment.Status.CONFIRMED)
        and s.status <> com.example.duty.entity.DutySchedule.Status.CANCELLED
        and s.date >= :fromDate and s.date < :toDate
      """)
  long countByEmployeeAndDateRange(@Param("employeeId") Long employeeId,
                                   @Param("fromDate") LocalDate fromDate,
                                   @Param("toDate") LocalDate toDate);

  /**
   * Lấy tất cả phân công còn hiệu lực trong ngày hôm nay — dùng cho job nhắc nhở Zalo 7:00 AM.
   * Eager-load schedule + shift + employee để tránh N+1 khi gửi hàng loạt.
   */
  @Query("""
      select a from DutyAssignment a
        join fetch a.schedule s
        join fetch s.shift sh
        join fetch a.employee e
      where s.date = :date
        and a.status in (com.example.duty.entity.DutyAssignment.Status.ASSIGNED, com.example.duty.entity.DutyAssignment.Status.CONFIRMED)
        and s.status in (com.example.duty.entity.DutySchedule.Status.CONFIRMED, com.example.duty.entity.DutySchedule.Status.LOCKED)
      """)
  List<DutyAssignment> findTodayActiveAssignments(@Param("date") LocalDate date);
}
