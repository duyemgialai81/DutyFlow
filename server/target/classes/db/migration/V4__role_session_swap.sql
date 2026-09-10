-- Role, phiên đăng nhập, yêu cầu đổi ca
CREATE TABLE IF NOT EXISTS role (
  id    BIGINT AUTO_INCREMENT PRIMARY KEY,
  code  VARCHAR(32)  NOT NULL,
  name  VARCHAR(80)  NOT NULL,
  UNIQUE KEY uk_role_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO role (code, name) VALUES
  ('ADMIN', 'Quản trị viên'),
  ('EMPLOYEE', 'Nhân viên')
ON DUPLICATE KEY UPDATE name = VALUES(name);

ALTER TABLE employee
  ADD COLUMN role_id BIGINT NULL AFTER department_id,
  ADD KEY idx_employee_role (role_id),
  ADD CONSTRAINT fk_employee_role FOREIGN KEY (role_id) REFERENCES role (id);

UPDATE employee e
SET e.role_id = (SELECT id FROM role WHERE code = 'EMPLOYEE' LIMIT 1)
WHERE e.role_id IS NULL;

INSERT INTO employee (employee_code, full_name, email, phone, department_id, role_id, status, password)
SELECT 'admin', 'Administrator', 'admin@example.com', NULL, NULL,
       (SELECT id FROM role WHERE code = 'ADMIN' LIMIT 1), 'ACTIVE', 'kyta@1234'
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM employee WHERE employee_code = 'admin');

UPDATE employee
SET role_id = (SELECT id FROM role WHERE code = 'ADMIN' LIMIT 1)
WHERE employee_code = 'admin';

CREATE TABLE IF NOT EXISTS auth_session (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  jti          VARCHAR(64)  NOT NULL,
  employee_id  BIGINT NULL,
  role_code    VARCHAR(32)  NOT NULL,
  token_hash   CHAR(64)     NOT NULL,
  expires_at   DATETIME     NOT NULL,
  revoked_at   DATETIME NULL,
  created_at   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_auth_session_jti (jti),
  KEY idx_auth_session_employee (employee_id),
  KEY idx_auth_session_expires (expires_at),
  CONSTRAINT fk_auth_session_employee FOREIGN KEY (employee_id) REFERENCES employee (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS swap_request (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  assignment_id BIGINT       NOT NULL,
  employee_id   BIGINT       NOT NULL,
  reason        VARCHAR(500) NOT NULL,
  status        VARCHAR(16)  NOT NULL DEFAULT 'PENDING',
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_swap_employee (employee_id, status),
  KEY idx_swap_assignment (assignment_id),
  CONSTRAINT fk_swap_assignment FOREIGN KEY (assignment_id) REFERENCES duty_assignment (id),
  CONSTRAINT fk_swap_employee FOREIGN KEY (employee_id) REFERENCES employee (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
