-- Bảng lưu cấu hình hệ thống dạng key-value (Admin chỉnh trực tiếp trên UI)
CREATE TABLE IF NOT EXISTS system_setting (
    setting_key   VARCHAR(120)  NOT NULL PRIMARY KEY,
    setting_value TEXT,
    description   VARCHAR(255),
    updated_at    DATETIME(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
);

-- Seed: giá trị mặc định rỗng (Admin sẽ điền trên giao diện)
INSERT IGNORE INTO system_setting (setting_key, setting_value, description) VALUES
  ('zalo.appId',     '',  'Zalo App ID từ Zalo Developers'),
  ('zalo.appSecret', '',  'Zalo App Secret từ Zalo Developers');
