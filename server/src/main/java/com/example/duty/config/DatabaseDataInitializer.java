package com.example.duty.config;

import com.example.duty.entity.*;
import com.example.duty.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/**
 * Tự động tạo dữ liệu khởi tạo (Seed Data) chuẩn doanh nghiệp khi ứng dụng chạy trên bất kỳ môi trường nào (kể cả H2 Database trên Hugging Face Spaces).
 * Đảm bảo 100% dữ liệu (Roles, Khoa phòng, Ca trực, Nhân viên, Lịch trực, Phân công, Đổi ca, Nghỉ phép, Thông báo, Cài đặt)
 * đều được lưu trữ và truy vấn từ cơ sở dữ liệu SQL, loại bỏ hoàn toàn mock data phía client.
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
public class DatabaseDataInitializer implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final ShiftRepository shiftRepository;
    private final EmployeeRepository employeeRepository;
    private final DutyScheduleRepository dutyScheduleRepository;
    private final DutyAssignmentRepository dutyAssignmentRepository;
    private final SwapRequestRepository swapRequestRepository;
    private final DayOffRepository dayOffRepository;
    private final AppNotificationRepository notificationRepository;
    private final SystemSettingRepository systemSettingRepository;

    @Override
    @Transactional
    public void run(String... args) {
        try {
            seedAllData();
        } catch (Exception ex) {
            log.error("[DatabaseDataInitializer] Lỗi khi khởi tạo dữ liệu mẫu: {}", ex.getMessage(), ex);
        }
    }

    @Transactional
    public synchronized void seedAllData() {
        log.info("[DatabaseDataInitializer] Bắt đầu kiểm tra và khởi tạo dữ liệu ban đầu vào SQL Database...");

        // 1. Roles
        Role roleAdmin = roleRepository.findByCode("ADMIN").orElseGet(() -> {
            Role r = new Role();
            r.setCode("ADMIN");
            r.setName("Quản trị viên");
            return roleRepository.save(r);
        });

        Role roleLeader = roleRepository.findByCode("LEADER").orElseGet(() -> {
            Role r = new Role();
            r.setCode("LEADER");
            r.setName("Tổ trưởng / Trưởng phòng");
            return roleRepository.save(r);
        });

        Role roleEmployee = roleRepository.findByCode("EMPLOYEE").orElseGet(() -> {
            Role r = new Role();
            r.setCode("EMPLOYEE");
            r.setName("Nhân viên");
            return roleRepository.save(r);
        });

        // 2. Departments
        List<Department> existingDepts = departmentRepository.findAll();
        if (existingDepts.isEmpty()) {
            String[] deptNames = {
                "Phòng Cấp Cứu", "Phòng Nội Tổng Hợp", "Phòng Ngoại Khoa", "Phòng Nhi Khoa", "Phòng Phụ Sản",
                "Phòng Hồi Sức Tích Cực", "Phòng Khám Đa Khoa", "Phòng Xét Nghiệm", "Phòng Chẩn Đoán Hình Ảnh", "Phòng Dược"
            };
            for (String name : deptNames) {
                Department d = new Department();
                d.setName(name);
                d.setStatus(Department.Status.ACTIVE);
                departmentRepository.save(d);
            }
            existingDepts = departmentRepository.findAll();
            log.info("[DatabaseDataInitializer] Đã khởi tạo {} khoa / phòng ban vào SQL.", existingDepts.size());
        }

        // 3. Shifts
        List<Shift> existingShifts = shiftRepository.findAll();
        if (existingShifts.isEmpty()) {
            Object[][] shiftData = {
                {"S1", "Ca Sáng", LocalTime.of(7, 0), LocalTime.of(11, 0), "Ca sáng sớm"},
                {"S2", "Ca Trưa", LocalTime.of(11, 0), LocalTime.of(15, 0), "Ca giữa ngày"},
                {"S3", "Ca Chiều", LocalTime.of(15, 0), LocalTime.of(19, 0), "Ca chiều tối"},
                {"S4", "Ca Tối", LocalTime.of(19, 0), LocalTime.of(23, 0), "Ca khuya"},
                {"S5", "Ca Đêm 1", LocalTime.of(18, 0), LocalTime.of(21, 0), "Ca tối phụ"},
                {"S6", "Ca Đêm 2", LocalTime.of(21, 0), LocalTime.of(23, 59), "Ca đêm khuya"},
                {"S7", "Ca Hành Chính", LocalTime.of(8, 0), LocalTime.of(17, 0), "Ca tiêu chuẩn"},
                {"S8", "Ca Tăng Cường 1", LocalTime.of(9, 0), LocalTime.of(13, 0), "Hỗ trợ sáng"},
                {"S9", "Ca Tăng Cường 2", LocalTime.of(13, 0), LocalTime.of(17, 0), "Hỗ trợ chiều"},
                {"S10", "Ca Cuối Tuần", LocalTime.of(8, 0), LocalTime.of(20, 0), "Ca trực cuối tuần dài"}
            };
            for (Object[] item : shiftData) {
                Shift s = new Shift();
                s.setCode((String) item[0]);
                s.setName((String) item[1]);
                s.setStartTime((LocalTime) item[2]);
                s.setEndTime((LocalTime) item[3]);
                s.setDescription((String) item[4]);
                s.setStatus(Shift.Status.ACTIVE);
                shiftRepository.save(s);
            }
            existingShifts = shiftRepository.findAll();
            log.info("[DatabaseDataInitializer] Đã khởi tạo {} ca trực chuẩn vào SQL.", existingShifts.size());
        }

        // 4. Employees
        Department firstDept = existingDepts.isEmpty() ? null : existingDepts.get(0);

        // 4.1 Admin account
        Employee admin = employeeRepository.findByEmployeeCode("admin").orElse(null);
        if (admin == null) {
            admin = new Employee();
            admin.setEmployeeCode("admin");
            admin.setFullName("Quản trị viên Hệ thống");
            admin.setEmail("admin@example.com");
            admin.setPhone("0900000000");
            admin.setRole(roleAdmin);
            admin.setStatus(Employee.Status.ACTIVE);
            admin.setPassword("kyta@1234");
            employeeRepository.save(admin);
            log.info("[DatabaseDataInitializer] Đã lưu tài khoản mẫu admin / kyta@1234 vào SQL");
        } else {
            if (admin.getRole() == null) admin.setRole(roleAdmin);
            if (admin.getPassword() == null) admin.setPassword("kyta@1234");
            employeeRepository.save(admin);
        }

        // 4.2 Leader account (Trần Văn Leader)
        Employee leader01 = employeeRepository.findByEmployeeCode("leader01").orElse(null);
        if (leader01 == null) {
            leader01 = new Employee();
            leader01.setEmployeeCode("leader01");
            leader01.setFullName("Trần Văn Leader");
            leader01.setEmail("leader01@example.com");
            leader01.setPhone("0901000099");
            leader01.setRole(roleLeader);
            leader01.setDepartment(firstDept);
            leader01.setStatus(Employee.Status.ACTIVE);
            leader01.setPassword("kyta@1234");
            employeeRepository.save(leader01);
            log.info("[DatabaseDataInitializer] Đã lưu tài khoản mẫu leader01 / kyta@1234 vào SQL");
        } else {
            if (leader01.getRole() == null) leader01.setRole(roleLeader);
            if (leader01.getPassword() == null) leader01.setPassword("kyta@1234");
            employeeRepository.save(leader01);
        }

        // 4.3 20 Employees: NV01 -> NV20
        String[] sampleNames = {
            "Nguyễn Văn A", "Trần Thị B", "Lê Văn C", "Phạm Thị D", "Hoàng Văn E",
            "Phan Thị F", "Vũ Văn G", "Đặng Thị H", "Bùi Văn I", "Đỗ Thị K",
            "Hồ Văn L", "Ngô Thị M", "Dương Văn N", "Lý Thị O", "Vương Văn P",
            "Trịnh Thị Q", "Đoàn Văn R", "Đào Thị S", "Lâm Văn T", "Phùng Thị U"
        };

        for (int i = 1; i <= sampleNames.length; i++) {
            String code = String.format("NV%02d", i);
            Employee emp = employeeRepository.findByEmployeeCode(code).orElse(null);
            if (emp == null) {
                emp = new Employee();
                emp.setEmployeeCode(code);
                emp.setFullName(sampleNames[i - 1]);
                emp.setEmail(code.toLowerCase() + "@example.com");
                emp.setPhone(String.format("09010000%02d", i));
                emp.setRole(roleEmployee);
                if (!existingDepts.isEmpty()) {
                    emp.setDepartment(existingDepts.get((i - 1) % existingDepts.size()));
                }
                emp.setStatus(Employee.Status.ACTIVE);
                emp.setPassword("kyta@1234");
                employeeRepository.save(emp);
            } else {
                if (emp.getRole() == null) emp.setRole(roleEmployee);
                if (emp.getPassword() == null) emp.setPassword("kyta@1234");
                employeeRepository.save(emp);
            }
        }

        // 5. Sample Schedules & Assignments
        if (dutyScheduleRepository.count() == 0 && !existingShifts.isEmpty() && !existingDepts.isEmpty()) {
            List<Employee> allEmployees = employeeRepository.findAll();
            LocalDate today = LocalDate.now();
            int empIdx = 0;

            for (int dayOffset = -3; dayOffset <= 10; dayOffset++) {
                LocalDate scheduleDate = today.plusDays(dayOffset);
                for (int sIdx = 0; sIdx < Math.min(3, existingShifts.size()); sIdx++) {
                    Shift shift = existingShifts.get(sIdx);
                    Department dept = existingDepts.get(sIdx % existingDepts.size());

                    DutySchedule schedule = new DutySchedule();
                    schedule.setDate(scheduleDate);
                    schedule.setShift(shift);
                    schedule.setDepartment(dept);
                    schedule.setRequiredPeople(2);
                    schedule.setLocation(dept.getName() + " - Phòng Trực");
                    schedule.setStatus(DutySchedule.Status.CONFIRMED);
                    schedule.setCreatedBy("admin");
                    DutySchedule savedSchedule = dutyScheduleRepository.save(schedule);

                    for (int k = 0; k < 2; k++) {
                        if (allEmployees.isEmpty()) break;
                        Employee assignedEmp = allEmployees.get(empIdx % allEmployees.size());
                        empIdx++;
                        DutyAssignment assignment = new DutyAssignment();
                        assignment.setSchedule(savedSchedule);
                        assignment.setEmployee(assignedEmp);
                        assignment.setStatus(dayOffset <= 0 ? DutyAssignment.Status.CONFIRMED : DutyAssignment.Status.ASSIGNED);
                        assignment.setAssignedAt(Instant.now());
                        if (assignment.getStatus() == DutyAssignment.Status.CONFIRMED) {
                            assignment.setConfirmedAt(Instant.now());
                        }
                        dutyAssignmentRepository.save(assignment);
                    }
                }
            }
            log.info("[DatabaseDataInitializer] Đã lưu lịch trực mẫu cho 14 ngày kèm phân công nhân sự vào SQL.");
        }

        // 6. DayOffs (Đăng ký nghỉ phép)
        if (dayOffRepository.count() == 0) {
            Employee nv01 = employeeRepository.findByEmployeeCode("NV01").orElse(null);
            Employee nv02 = employeeRepository.findByEmployeeCode("NV02").orElse(null);
            if (nv01 != null) {
                DayOff d1 = new DayOff();
                d1.setEmployee(nv01);
                d1.setDate(LocalDate.now().plusDays(2));
                d1.setReason("Nghỉ giải quyết việc gia đình");
                d1.setStatus(DayOff.Status.PENDING);
                dayOffRepository.save(d1);
            }
            if (nv02 != null) {
                DayOff d2 = new DayOff();
                d2.setEmployee(nv02);
                d2.setDate(LocalDate.now().plusDays(5));
                d2.setReason("Nghỉ phép thường niên");
                d2.setStatus(DayOff.Status.APPROVED);
                dayOffRepository.save(d2);
            }
            log.info("[DatabaseDataInitializer] Đã lưu dữ liệu đăng ký nghỉ phép vào SQL.");
        }

        // 7. SwapRequests (Yêu cầu đổi ca)
        if (swapRequestRepository.count() == 0) {
            List<DutyAssignment> assignments = dutyAssignmentRepository.findAll();
            if (!assignments.isEmpty()) {
                DutyAssignment a1 = assignments.get(0);
                SwapRequest sr1 = new SwapRequest();
                sr1.setAssignment(a1);
                sr1.setEmployee(a1.getEmployee());
                sr1.setReason("Trùng lịch học chuyên khoa, xin đổi sang ca sau");
                sr1.setStatus(SwapRequest.Status.PENDING);
                swapRequestRepository.save(sr1);

                if (assignments.size() > 1) {
                    DutyAssignment a2 = assignments.get(1);
                    SwapRequest sr2 = new SwapRequest();
                    sr2.setAssignment(a2);
                    sr2.setEmployee(a2.getEmployee());
                    sr2.setReason("Đổi ca trực hỗ trợ đồng nghiệp");
                    sr2.setStatus(SwapRequest.Status.APPROVED);
                    swapRequestRepository.save(sr2);
                }
                log.info("[DatabaseDataInitializer] Đã lưu dữ liệu yêu cầu đổi ca vào SQL.");
            }
        }

        // 8. Notifications (Thông báo ứng dụng)
        if (notificationRepository.count() == 0) {
            Employee adminUser = employeeRepository.findByEmployeeCode("admin").orElse(null);
            Employee nv01User = employeeRepository.findByEmployeeCode("NV01").orElse(null);
            if (adminUser != null) {
                AppNotification n1 = new AppNotification();
                n1.setEmployee(adminUser);
                n1.setType(AppNotification.Type.SCHEDULE_ASSIGNED);
                n1.setTitle("Hệ thống khởi động thành công");
                n1.setContent("Chào mừng Quản trị viên! Cơ sở dữ liệu và các ca trực đã sẵn sàng vận hành.");
                n1.setChannel(AppNotification.Channel.IN_APP);
                n1.setStatus(AppNotification.Status.SENT);
                n1.setIdempotencyKey("welcome-admin-" + UUID.randomUUID());
                n1.setRead(false);
                notificationRepository.save(n1);
            }
            if (nv01User != null) {
                AppNotification n2 = new AppNotification();
                n2.setEmployee(nv01User);
                n2.setType(AppNotification.Type.DUTY_REMINDER);
                n2.setTitle("Nhắc nhở ca trực sắp tới");
                n2.setContent("Bạn có ca trực Ca Sáng tại Phòng Cấp Cứu. Vui lòng có mặt đúng giờ.");
                n2.setChannel(AppNotification.Channel.IN_APP);
                n2.setStatus(AppNotification.Status.SENT);
                n2.setIdempotencyKey("reminder-nv01-" + UUID.randomUUID());
                n2.setRead(false);
                notificationRepository.save(n2);
            }
            log.info("[DatabaseDataInitializer] Đã lưu thông báo khởi tạo vào SQL.");
        }

        // 9. System Settings
        if (systemSettingRepository.count() == 0) {
            saveSetting("notification_channel", "APP,ZALO", "Kênh thông báo mặc định");
            saveSetting("auto_reminder_hours", "24", "Thời gian gửi nhắc nhở trước ca trực (giờ)");
            saveSetting("max_shifts_per_week", "5", "Số ca tối đa nhân viên trực trong 1 tuần");
            saveSetting("allow_swap_approval_by_leader", "true", "Cho phép tổ trưởng phê duyệt đổi ca");
            log.info("[DatabaseDataInitializer] Đã lưu cấu hình hệ thống mặc định vào SQL.");
        }

        log.info("[DatabaseDataInitializer] Hoàn tất nạp dữ liệu vào SQL! Tổng nhân viên: {}, Tổng ca trực: {}",
                employeeRepository.count(), dutyScheduleRepository.count());
    }

    private void saveSetting(String key, String value, String description) {
        SystemSetting setting = new SystemSetting();
        setting.setKey(key);
        setting.setValue(value);
        setting.setDescription(description);
        systemSettingRepository.save(setting);
    }
}
