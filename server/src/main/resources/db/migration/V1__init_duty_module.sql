-- ============================================================
-- Module Phân lịch trực + Quản lý ca trực + Thông báo Zalo
-- Charset utf8mb4 (hỗ trợ tiếng Việt + emoji trong notification)
-- ============================================================

CREATE TABLE IF NOT EXISTS department (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  name          VARCHAR(120)  NOT NULL,
  status        VARCHAR(16)   NOT NULL DEFAULT 'ACTIVE',
  UNIQUE KEY uk_department_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employee (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_code VARCHAR(32)   NOT NULL,
  full_name     VARCHAR(150)  NOT NULL,
  email         VARCHAR(150),
  phone         VARCHAR(32),
  department_id BIGINT,
  status        VARCHAR(16)   NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_employee_code (employee_code),
  KEY idx_employee_department (department_id),
  CONSTRAINT fk_employee_department FOREIGN KEY (department_id) REFERENCES department (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS shift (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(16)  NOT NULL,
  name        VARCHAR(60)  NOT NULL,
  start_time  TIME         NOT NULL,
  end_time    TIME         NOT NULL,
  description VARCHAR(255),
  status      VARCHAR(16)  NOT NULL DEFAULT 'ACTIVE',
  UNIQUE KEY uk_shift_code (code),
  CONSTRAINT chk_shift_time CHECK (start_time < end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS duty_schedule (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  `date`          DATE         NOT NULL,
  shift_id        BIGINT       NOT NULL,
  required_people INT          NOT NULL DEFAULT 1,
  location        VARCHAR(150) NOT NULL,
  department_id   BIGINT NULL,
  status          VARCHAR(16)  NOT NULL DEFAULT 'DRAFT', -- DRAFT|CONFIRMED|LOCKED|CANCELLED
  created_by      VARCHAR(150) NOT NULL,
  created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_schedule_date_shift (date, shift_id),   -- chống tạo lịch trùng (kể cả CANCELLED; service kiểm tra status)
  KEY idx_schedule_status (status),
  KEY idx_schedule_date (date),
  CONSTRAINT fk_schedule_shift FOREIGN KEY (shift_id) REFERENCES shift (id),
  CONSTRAINT fk_schedule_department FOREIGN KEY (department_id) REFERENCES department (id),
  CONSTRAINT chk_required_people CHECK (required_people > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS duty_assignment (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  schedule_id  BIGINT      NOT NULL,
  employee_id  BIGINT      NOT NULL,
  status       VARCHAR(16) NOT NULL DEFAULT 'ASSIGNED', -- ASSIGNED|CONFIRMED|DECLINED|CANCELLED
  assigned_at  DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  confirmed_at DATETIME NULL,
  KEY idx_assignment_schedule (schedule_id),
  KEY idx_assignment_employee (employee_id),
  CONSTRAINT fk_assignment_schedule FOREIGN KEY (schedule_id) REFERENCES duty_schedule (id),
  CONSTRAINT fk_assignment_employee FOREIGN KEY (employee_id) REFERENCES employee (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS day_off (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT       NOT NULL,
  `date`      DATE         NOT NULL,
  reason      VARCHAR(255) NOT NULL,
  status      VARCHAR(16)  NOT NULL DEFAULT 'PENDING', -- PENDING|APPROVED|REJECTED
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_dayoff_employee_date (employee_id, date),
  CONSTRAINT fk_dayoff_employee FOREIGN KEY (employee_id) REFERENCES employee (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS zalo_mapping (
  id                BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id       BIGINT      NOT NULL,
  zalo_user_id      VARCHAR(64) NOT NULL,
  status            VARCHAR(16) NOT NULL DEFAULT 'CONNECTED',
  -- Token MÃ HOÁ (AES-GCM). Không lưu plaintext, không trả về API, không log.
  access_token_enc  VARCHAR(512),
  refresh_token_enc VARCHAR(512),
  receive_notifications TINYINT(1) NOT NULL DEFAULT 1,
  connected_at      DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_zalo_employee (employee_id),
  UNIQUE KEY uk_zalo_user (zalo_user_id),
  CONSTRAINT fk_zalo_employee FOREIGN KEY (employee_id) REFERENCES employee (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notification (
  id                   BIGINT AUTO_INCREMENT PRIMARY KEY,
  employee_id          BIGINT       NOT NULL,
  type                 VARCHAR(32)  NOT NULL,
  title                VARCHAR(255) NOT NULL,
  content              TEXT         NOT NULL,
  channel              VARCHAR(16)  NOT NULL DEFAULT 'ZALO',
  status               VARCHAR(16)  NOT NULL DEFAULT 'PENDING', -- PENDING|PROCESSING|SENT|FAILED|RETRYING
  external_message_id  VARCHAR(120),
  request_id           VARCHAR(64),
  idempotency_key      VARCHAR(190) NOT NULL,
  retry_count          INT          NOT NULL DEFAULT 0,
  last_error           VARCHAR(500),
  read_flag            TINYINT(1)   NOT NULL DEFAULT 0,
  created_at           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at              DATETIME NULL,
  UNIQUE KEY uk_notification_idem (idempotency_key), -- chống gửi trùng ở mức DB
  KEY idx_notification_employee (employee_id, read_flag),
  KEY idx_notification_status (status),
  CONSTRAINT fk_notification_employee FOREIGN KEY (employee_id) REFERENCES employee (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS schedule_history (
  id          BIGINT AUTO_INCREMENT PRIMARY KEY,
  schedule_id BIGINT      NOT NULL,
  action      VARCHAR(32) NOT NULL,
  old_value   TEXT,
  new_value   TEXT,
  changed_by  VARCHAR(150) NOT NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_history_schedule (schedule_id, created_at),
  CONSTRAINT fk_history_schedule FOREIGN KEY (schedule_id) REFERENCES duty_schedule (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ====== Dữ liệu ca mặc định ======
INSERT INTO shift (code, name, start_time, end_time, description) VALUES
  ('MORNING',   'Ca sáng',  '08:00:00', '12:00:00', 'Trực buổi sáng'),
  ('AFTERNOON', 'Ca chiều', '13:00:00', '17:00:00', 'Trực buổi chiều'),
  ('NIGHT',     'Ca tối',   '18:00:00', '22:00:00', 'Trực buổi tối')
ON DUPLICATE KEY UPDATE name = VALUES(name);
