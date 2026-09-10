-- V2__insert_mock_data.sql
-- Thêm dữ liệu mẫu (10 bản ghi mỗi bảng, 20 nhân viên)
-- Mật khẩu đăng nhập ở AuthController đã hardcode chung là kyta@1234 cho mọi username.

-- 1. Xóa dữ liệu cũ nếu có (bỏ mock data cũ)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE schedule_history;
TRUNCATE TABLE notification;
TRUNCATE TABLE zalo_mapping;
TRUNCATE TABLE day_off;
TRUNCATE TABLE duty_assignment;
TRUNCATE TABLE duty_schedule;
TRUNCATE TABLE shift;
TRUNCATE TABLE employee;
TRUNCATE TABLE department;
SET FOREIGN_KEY_CHECKS = 1;

-- 2. department (10 bản ghi)
INSERT INTO department (name) VALUES 
('Phòng Cấp Cứu'), ('Phòng Nội Tổng Hợp'), ('Phòng Ngoại Khoa'), ('Phòng Nhi Khoa'), ('Phòng Phụ Sản'),
('Phòng Hồi Sức Tích Cực'), ('Phòng Khám Đa Khoa'), ('Phòng Xét Nghiệm'), ('Phòng Chẩn Đoán Hình Ảnh'), ('Phòng Dược');

-- 3. employee (20 bản ghi)
-- username (employee_code) sẽ là NV01 đến NV20, đăng nhập với mk kyta@1234
INSERT INTO employee (employee_code, full_name, email, phone, department_id) VALUES 
('NV01', 'Nguyễn Văn A', 'nv01@example.com', '0901000001', 1),
('NV02', 'Trần Thị B', 'nv02@example.com', '0901000002', 1),
('NV03', 'Lê Văn C', 'nv03@example.com', '0901000003', 2),
('NV04', 'Phạm Thị D', 'nv04@example.com', '0901000004', 2),
('NV05', 'Hoàng Văn E', 'nv05@example.com', '0901000005', 3),
('NV06', 'Phan Thị F', 'nv06@example.com', '0901000006', 3),
('NV07', 'Vũ Văn G', 'nv07@example.com', '0901000007', 4),
('NV08', 'Đặng Thị H', 'nv08@example.com', '0901000008', 4),
('NV09', 'Bùi Văn I', 'nv09@example.com', '0901000009', 5),
('NV10', 'Đỗ Thị K', 'nv10@example.com', '0901000010', 5),
('NV11', 'Hồ Văn L', 'nv11@example.com', '0901000011', 6),
('NV12', 'Ngô Thị M', 'nv12@example.com', '0901000012', 6),
('NV13', 'Dương Văn N', 'nv13@example.com', '0901000013', 7),
('NV14', 'Lý Thị O', 'nv14@example.com', '0901000014', 7),
('NV15', 'Vương Văn P', 'nv15@example.com', '0901000015', 8),
('NV16', 'Trịnh Thị Q', 'nv16@example.com', '0901000016', 8),
('NV17', 'Đoàn Văn R', 'nv17@example.com', '0901000017', 9),
('NV18', 'Đào Thị S', 'nv18@example.com', '0901000018', 9),
('NV19', 'Lâm Văn T', 'nv19@example.com', '0901000019', 10),
('NV20', 'Phùng Thị U', 'nv20@example.com', '0901000020', 10);

-- 4. shift (10 bản ghi)
INSERT INTO shift (code, name, start_time, end_time, description) VALUES
('S1', 'Ca Sáng', '07:00:00', '11:00:00', 'Ca sáng sớm'),
('S2', 'Ca Trưa', '11:00:00', '15:00:00', 'Ca giữa ngày'),
('S3', 'Ca Chiều', '15:00:00', '19:00:00', 'Ca chiều tối'),
('S4', 'Ca Tối', '19:00:00', '23:00:00', 'Ca khuya'),
('S5', 'Ca Đêm 1', '18:00:00', '21:00:00', 'Ca tối phụ'),
('S6', 'Ca Đêm 2', '21:00:00', '23:59:00', 'Ca đêm khuya'),
('S7', 'Ca Hành Chính', '08:00:00', '17:00:00', 'Ca tiêu chuẩn'),
('S8', 'Ca Tăng Cường 1', '09:00:00', '13:00:00', 'Hỗ trợ sáng'),
('S9', 'Ca Tăng Cường 2', '13:00:00', '17:00:00', 'Hỗ trợ chiều'),
('S10', 'Ca Cuối Tuần', '08:00:00', '20:00:00', 'Ca trực cuối tuần dài');

-- 5. duty_schedule (10 bản ghi)
INSERT INTO duty_schedule (`date`, shift_id, required_people, location, department_id, created_by, status) VALUES 
('2026-08-23', 1, 2, 'Tầng 1 - Khu A', 1, 'admin', 'CONFIRMED'),
('2026-08-23', 2, 2, 'Tầng 1 - Khu B', 1, 'admin', 'CONFIRMED'),
('2026-08-24', 3, 2, 'Tầng 2 - Khu A', 2, 'admin', 'DRAFT'),
('2026-08-24', 4, 1, 'Tầng 2 - Khu B', 2, 'admin', 'DRAFT'),
('2026-08-25', 1, 3, 'Tầng 3 - Khu A', 3, 'admin', 'CONFIRMED'),
('2026-08-25', 5, 2, 'Tầng 3 - Khu B', 3, 'admin', 'DRAFT'),
('2026-08-26', 6, 2, 'Tầng 4 - Khu A', 4, 'admin', 'CONFIRMED'),
('2026-08-26', 7, 1, 'Tầng 4 - Khu B', 4, 'admin', 'LOCKED'),
('2026-08-27', 8, 2, 'Tầng 5 - Khu A', 5, 'admin', 'CONFIRMED'),
('2026-08-27', 9, 2, 'Tầng 5 - Khu B', 5, 'admin', 'DRAFT');

-- 6. duty_assignment (10 bản ghi)
INSERT INTO duty_assignment (schedule_id, employee_id, status) VALUES 
(1, 1, 'CONFIRMED'),
(1, 2, 'ASSIGNED'),
(2, 3, 'CONFIRMED'),
(2, 4, 'CONFIRMED'),
(3, 5, 'ASSIGNED'),
(3, 6, 'ASSIGNED'),
(5, 7, 'CONFIRMED'),
(5, 8, 'CONFIRMED'),
(7, 9, 'CONFIRMED'),
(7, 10, 'ASSIGNED');

-- 7. day_off (10 bản ghi)
INSERT INTO day_off (employee_id, `date`, reason, status) VALUES 
(1, '2026-08-28', 'Nghỉ ốm', 'APPROVED'),
(2, '2026-08-28', 'Việc gia đình', 'PENDING'),
(3, '2026-08-29', 'Nghỉ phép năm', 'APPROVED'),
(4, '2026-08-29', 'Đi khám bệnh', 'REJECTED'),
(5, '2026-08-30', 'Việc cá nhân', 'PENDING'),
(6, '2026-08-30', 'Đám cưới', 'APPROVED'),
(7, '2026-08-31', 'Nghỉ bù', 'APPROVED'),
(8, '2026-08-31', 'Du lịch', 'PENDING'),
(9, '2026-09-01', 'Ốm', 'PENDING'),
(10, '2026-09-01', 'Việc riêng', 'APPROVED');

-- 8. zalo_mapping (10 bản ghi)
INSERT INTO zalo_mapping (employee_id, zalo_user_id) VALUES 
(1, 'zalo_user_1'), (2, 'zalo_user_2'), (3, 'zalo_user_3'), (4, 'zalo_user_4'), (5, 'zalo_user_5'),
(6, 'zalo_user_6'), (7, 'zalo_user_7'), (8, 'zalo_user_8'), (9, 'zalo_user_9'), (10, 'zalo_user_10');

-- 9. notification (10 bản ghi)
INSERT INTO notification (employee_id, type, title, content, idempotency_key, status) VALUES 
(1, 'SCHEDULE_ASSIGNED', 'Lịch trực mới', 'Bạn có lịch trực mới...', 'idem_1', 'PENDING'),
(2, 'SCHEDULE_ASSIGNED', 'Lịch trực mới', 'Bạn có lịch trực mới...', 'idem_2', 'SENT'),
(3, 'SCHEDULE_UPDATED', 'Cập nhật lịch trực', 'Lịch của bạn đã thay đổi', 'idem_3', 'SENT'),
(4, 'SCHEDULE_CANCELLED', 'Hủy lịch trực', 'Lịch trực bị hủy', 'idem_4', 'FAILED'),
(5, 'SCHEDULE_ASSIGNED', 'Lịch trực mới', 'Bạn có lịch trực mới...', 'idem_5', 'PENDING'),
(6, 'SCHEDULE_ASSIGNED', 'Lịch trực mới', 'Bạn có lịch trực mới...', 'idem_6', 'SENT'),
(7, 'SCHEDULE_UPDATED', 'Cập nhật lịch trực', 'Lịch của bạn đã thay đổi', 'idem_7', 'SENT'),
(8, 'SCHEDULE_CANCELLED', 'Hủy lịch trực', 'Lịch trực bị hủy', 'idem_8', 'FAILED'),
(9, 'SCHEDULE_ASSIGNED', 'Lịch trực mới', 'Bạn có lịch trực mới...', 'idem_9', 'PENDING'),
(10, 'SCHEDULE_ASSIGNED', 'Lịch trực mới', 'Bạn có lịch trực mới...', 'idem_10', 'SENT');

-- 10. schedule_history (10 bản ghi)
INSERT INTO schedule_history (schedule_id, action, changed_by) VALUES 
(1, 'CREATE', 'admin'),
(1, 'CONFIRM', 'admin'),
(2, 'CREATE', 'admin'),
(2, 'CONFIRM', 'admin'),
(3, 'CREATE', 'admin'),
(4, 'CREATE', 'admin'),
(5, 'CREATE', 'admin'),
(5, 'CONFIRM', 'admin'),
(7, 'CREATE', 'admin'),
(7, 'CONFIRM', 'admin');
