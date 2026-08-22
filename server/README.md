# Duty Module — Backend (Java 21 · Spring Boot 3)

Module **Phân lịch trực + Quản lý ca trực + Thông báo Zalo**. Frontend React/Vite gọi REST API của module này; khi chưa có backend, frontend tự chạy bằng adapter mô phỏng đúng contract.

## Chạy backend

```bash
# 1) Tạo database
mysql -uroot -p -e "CREATE DATABASE duty CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 2) Cấu hình env (không hard-code trong code)
export DB_URL="jdbc:mysql://localhost:3306/duty"
export DB_USER=root DB_PASSWORD=secret
export JWT_SECRET="your-32-chars-min-secret"
export CORS_ALLOWED_ORIGINS="http://localhost:5173"
export ZALO_APP_ID=... ZALO_APP_SECRET=...
export ZALO_CALLBACK_URL="http://localhost:8080/api/integrations/zalo/callback"
export ZALO_TOKEN_CIPHER_KEY="$(openssl rand -base64 32)"

# 3) Chạy
mvn spring-boot:run

# 4) Test
mvn test
```

Flyway tự chạy `db/migration/V1__init_duty_module.sql`.

## Tích hợp vào project có sẵn

- Đổi package `com.example.duty` theo project của bạn.
- Nếu đã có entity `User/Employee`: map `employee.id` hiện có, KHÔNG tạo bảng trùng.
- Nếu đã có `NotificationService`: implement interface `NotificationChannel` của module để tái sử dụng pipeline retry/idempotency.

## Giới hạn Zalo cần biết

- **Social API** gửi tin nhắn cá nhân phải được Zalo duyệt quyền cho app.
- **Zalo OA**: cần OA xác thực, dùng OA Message API (`/v2.0/oa/message/cs`), giới hạn quota/ngày.
- Thiết kế tách kênh qua `NotificationChannel` → thay provider (Zalo OA/ZNS/SMS) không đổi nghiệp vụ.
