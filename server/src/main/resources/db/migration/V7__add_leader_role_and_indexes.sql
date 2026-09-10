-- V7: Thêm role LEADER + tài khoản leader01 + database indexes tối ưu query
-- ============================================================

-- 1. Thêm role LEADER
INSERT INTO role (code, name) VALUES
  ('LEADER', 'Tổ trưởng / Trưởng phòng')
ON DUPLICATE KEY UPDATE name = VALUES(name);

-- 2. Tài khoản mẫu leader01 (Trưởng phòng Cấp Cứu)
INSERT INTO employee (employee_code, full_name, email, phone, department_id, role_id, status, password)
SELECT 'leader01', 'Trần Văn Leader', 'leader01@example.com', '0901000099',
       (SELECT id FROM department WHERE name = 'Phòng Cấp Cứu' LIMIT 1),
       (SELECT id FROM role WHERE code = 'LEADER' LIMIT 1),
       'ACTIVE', 'kyta@1234'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM employee WHERE employee_code = 'leader01');

-- 3. Đảm bảo tất cả nhân viên chưa có role_id đều được gán EMPLOYEE
UPDATE employee e
SET e.role_id = (SELECT id FROM role WHERE code = 'EMPLOYEE' LIMIT 1)
WHERE e.role_id IS NULL;

-- ============================================================
-- Database Indexes tối ưu các câu query thường xuyên (chuẩn MySQL)
-- ============================================================

-- duty_schedule: query theo date range (calendar view), status, department
CREATE INDEX idx_schedule_date_status ON duty_schedule (date, status);
CREATE INDEX idx_schedule_dept_date   ON duty_schedule (department_id, date);
CREATE INDEX idx_schedule_date_shift  ON duty_schedule (date, shift_id);

-- duty_assignment: query theo employee để xem lịch của mình
CREATE INDEX idx_assign_emp_status    ON duty_assignment (employee_id, status);
CREATE INDEX idx_assign_schedule_emp  ON duty_assignment (schedule_id, employee_id);

-- notification: query theo employee + read flag + status (dashboard + notification list)
CREATE INDEX idx_notif_emp_read       ON notification (employee_id, read_flag, created_at);
CREATE INDEX idx_notif_status_created ON notification (status, created_at);

-- zalo_mapping: query theo employee + status (notification pipeline)
CREATE INDEX idx_zalo_emp_status      ON zalo_mapping (employee_id, status);

-- swap_request: query theo status để admin duyệt
CREATE INDEX idx_swap_status_created  ON swap_request (status, created_at);

-- day_off: query theo date range
CREATE INDEX idx_dayoff_date_status   ON day_off (date, status);
