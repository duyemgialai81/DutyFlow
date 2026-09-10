# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Hệ thống phục vụ 3 nhóm người dùng trong bất kỳ tổ chức, doanh nghiệp hoặc cơ sở y tế có nhu cầu trực xoay vòng 24/7:
- **Quản trị viên (Admin)**: Quản lý danh mục nhân sự, giám sát tổng quan ca trực, cấu hình kết nối Zalo Official Account/App, quản trị hệ thống toàn diện. Không tham gia ca trực trực tiếp.
- **Tổ trưởng / Trưởng bộ phận (Leader)**: Lập kế hoạch phân ca, chạy thuật toán phân ca tự động, điều phối kéo thả nhân sự trên lịch tài nguyên, phê duyệt yêu cầu đổi ca và đơn đăng ký nghỉ phép của nhân viên. Không có trang "Ca trực của tôi".
- **Nhân viên trực (Employee)**: Theo dõi lịch trực cá nhân ("Ca của tôi"), xác nhận hoặc từ chối ca trực được phân công, gửi yêu cầu đổi ca cho đồng nghiệp, đăng ký lịch nghỉ phép, kết nối tài khoản Zalo cá nhân để nhận thông báo tự động.

## Product Purpose

DutyFlow giải quyết bài toán phức tạp và tốn thời gian trong việc sắp xếp, điều phối và thông báo lịch trực xoay vòng. Mục tiêu của sản phẩm là tự động hóa khâu phân bổ công bằng, giảm thiểu sai sót do trùng lịch hoặc thiếu nhân sự, đồng thời đảm bảo nhân viên luôn nắm bắt lịch trực kịp thời qua kênh thông báo Zalo quen thuộc.

## Positioning

DutyFlow kết hợp giữa **giao diện tương tác trực quan thời gian thực** (lịch tài nguyên kéo thả, cảnh báo thiếu người trực quan) với **thuật toán phân ca tự động công bằng** (giới hạn tối đa 10 ca/tháng, né trùng ca, né ngày nghỉ phép) và **hệ thống thông báo Zalo 2 bước đa kênh** (gửi thông báo ngay khi phân ca + hẹn giờ gửi tin nhắn nhắc nhở tự động lúc 7:00 AM vào đúng ngày trực kèm cơ chế chống gửi trùng idempotency).

## Operating Context

- Môi trường hoạt động: Ứng dụng web chạy trên trình duyệt máy tính (cho Admin/Leader thao tác điều phối chuyên sâu) và thiết bị di động (cho Nhân viên tra cứu ca trực nhanh).
- Nhịp vận hành thực tế: Ca trực liên tục (Ca Sáng 07:00–11:00, Ca Chiều 13:00–17:00, Ca Đêm 18:00–22:00 hoặc các khung giờ tùy biến), nhân sự luân phiên đổi ca và gửi đơn nghỉ phép phát sinh hàng ngày.
- Tích hợp thông báo: Tin nhắn Zalo trực tiếp tới điện thoại của nhân viên qua Zalo Bot / Zalo ZNS.

## Capabilities and Constraints

- **Quản lý ca trực**: Lịch trực hiển thị theo dạng Resource Calendar (nhân viên theo hàng dọc, ngày theo hàng ngang), hỗ trợ chế độ xem Tháng / Tuần / Ngày, lọc theo phòng ban và ca trực.
- **Quy tắc phân ca**: Mỗi nhân viên tối đa 10 ca/tháng; không phân trùng ca cùng khung giờ; tự động loại trừ nhân viên đang trong trạng thái nghỉ phép đã duyệt.
- **Bảo mật & Phân quyền**: Phân quyền nghiêm ngặt 3 cấp độ (ADMIN, LEADER, EMPLOYEE) trên cả Spring Boot backend (Spring Security + JWT) và React frontend (Route guards).
- **Bộ nhớ đệm & Tối ưu hóa**: Sử dụng Redis Cache cho phiên đăng nhập và truy vấn nhanh; hệ cơ sở dữ liệu MySQL 8.0 được đánh index chuyên sâu trên các trường thường xuyên tra cứu.
- **Ràng buộc kỹ thuật**: Backend Spring Boot 3 + Java 21, Frontend React 18 + Vite + Tailwind CSS + Lucide Icons.

## Brand Commitments

- Tên sản phẩm: **DutyFlow**
- Tone & Voice: Chuyên nghiệp, tin cậy, rõ ràng, dứt khoát; giao diện hiện đại, tinh gọn, tập trung cao độ vào tính hiệu quả trong công việc điều phối (Operate mode).
- Màu sắc chủ đạo: Xanh dương công nghệ tin cậy (Brand Blue `#2563eb`), kết hợp bảng trạng thái rõ nét (Xanh lá - Xác nhận/Đủ người, Hổ phách - Chờ duyệt/Cần lưu ý, Đỏ - Thiếu nhân sự/Từ chối).

## Evidence on Hand

- Toàn bộ source code frontend React TypeScript hoàn chỉnh tại thư mục `client/` với đầy đủ component, modal, drawer và route guards.
- Toàn bộ backend Spring Boot 3 với 7 bản migration Flyway (từ V1 đến V7) đã hoàn thiện và kiểm thử với Docker Compose (MySQL + Redis + App).
- Tài khoản mẫu sẵn sàng kiểm thử (mật khẩu `kyta@1234`): `admin` (Quản trị), `leader01` (Tổ trưởng), `NV01` (Nhân viên).

## Product Principles

1. **Hiệu quả điều phối là ưu tiên hàng đầu**: Mọi thông tin về trạng thái ca (Đủ người, Thiếu người, Đã khóa) và nhân sự phải nhận biết được trong vòng 3 giây quan sát.
2. **Công bằng và minh bạch**: Thuật toán phân ca tuân thủ nghiêm ngặt định mức tải công việc; nhân viên luôn có quyền xác nhận hoặc chủ động gửi yêu cầu đổi ca.
3. **Đúng lúc, đúng người qua Zalo**: Không để nhân viên bỏ lỡ ca trực; thông tin phân ca và nhắc nhở ngày trực được đưa thẳng vào Zalo cá nhân tự động và chính xác tuyệt đối.
4. **Không ngắt quãng thao tác**: Kéo thả mượt mà, phân ca tự động theo lô (batch), thông báo xác nhận rõ ràng, không làm gián đoạn dòng công việc của người quản lý.

## Accessibility & Inclusion

- Tương phản màu sắc rõ ràng theo tiêu chuẩn WCAG AA cho các nhãn trạng thái ca trực (badge), khung giờ và tên nhân viên.
- Hỗ trợ đầy đủ phím tắt và thao tác bàn phím trên các bảng biểu, modal và form điền thông tin.
