-- V8: Composite Indexes cấp doanh nghiệp tối ưu hoá truy vấn đa chiều (Sub-millisecond DB execution)
-- =================================================================================================

-- 1. Index phức hợp cho duty_schedule: Lọc theo Khoa + Ngày + Trạng thái (phổ biến nhất khi Leader xem lịch khoa)
CREATE INDEX idx_schedule_dept_date_status ON duty_schedule (department_id, `date`, status);

-- 2. Index phức hợp phục vụ tìm kiếm theo Ngày + Trạng thái + Khoa (báo cáo toàn viện)
CREATE INDEX idx_schedule_date_status_dept ON duty_schedule (`date`, status, department_id);

-- 3. Index phức hợp cho duty_assignment: Tìm ca trực của nhân viên theo trạng thái và thời gian tạo
CREATE INDEX idx_assign_emp_status_created ON duty_assignment (employee_id, status, created_at);

-- 4. Index phức hợp cho employee: Lọc danh sách nhân viên theo Khoa + Vai trò + Trạng thái
CREATE INDEX idx_employee_dept_role_status ON employee (department_id, role_id, status);
