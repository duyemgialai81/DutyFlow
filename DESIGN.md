---
name: DutyFlow
description: Hệ thống quản lý và điều phối lịch trực xoay vòng tự động 24/7
colors:
  canvas: "#f7f8fa"
  surface: "#ffffff"
  ink: "#111827"
  ink-sub: "#6b7280"
  ink-faint: "#9ca3af"
  edge: "#e5e7eb"
  edge-soft: "#f0f1f3"
  primary: "#2563eb"
  primary-hover: "#1d4ed8"
  primary-active: "#1e40af"
  primary-subtle: "#eff6ff"
  primary-tint: "#dbeafe"
  shift-morning: "#f59e0b"
  shift-morning-bg: "#fffbeb"
  shift-afternoon: "#2563eb"
  shift-afternoon-bg: "#eff6ff"
  shift-night: "#64748b"
  shift-night-bg: "#f1f5f9"
  status-success: "#16a34a"
  status-success-bg: "#f0fdf4"
  status-warning: "#f59e0b"
  status-warning-bg: "#fffbeb"
  status-danger: "#ef4444"
  status-danger-bg: "#fef2f2"
typography:
  display:
    fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  headline:
    fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "18px"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.015em"
  title:
    fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.4
  body:
    fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "13.5px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: '"Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif'
    fontSize: "11.5px"
    fontWeight: 600
    lineHeight: 1.4
rounded:
  sm: "6px"
  md: "10px"
  lg: "14px"
  xl: "16px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "40px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 16px"
    height: "40px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
    height: "40px"
  card-container:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "20px 20px"
---

# Design System: DutyFlow

## Overview

**Creative North Star: "The Precision Clockwork"**

DutyFlow được xây dựng như một cỗ máy điều hòa ca trực chuẩn xác, tinh tế và đáng tin cậy. Trong môi trường vận hành trực xoay vòng 24/7 (bệnh viện, nhà máy, trung tâm chỉ huy viễn thông, bảo vệ), mọi quyết định điều phối đều đòi hỏi tính chuẩn mực, trật tự, công bằng và khả năng nhận biết tức thì. Giao diện từ chối sự màu mè, rối mắt; từng đường kẻ, sắc độ màu và khoảng cách đều phục vụ mục tiêu duy nhất: người quản lý nắm bắt toàn cảnh tình trạng ca trực trong 3 giây và nhân viên tra cứu ca trực của mình chỉ bằng một thao tác lướt mắt.

Hệ thống hoạt động ở chế độ **Operate Mode** (vận hành tác chiến). Cấu trúc thị giác mang tính phân tầng rõ rệt: nền canvas xám lạnh thanh thoát (`#f7f8fa`) nâng đỡ các bề mặt thao tác màu trắng tinh khiết (`#ffffff`), được viền bằng nét phân định vi mô (`#e5e7eb`). Không gian làm việc kết hợp giữa sự nghiêm cẩn về mặt dữ liệu (sử dụng font số cố định độ rộng `tabular-nums`) với phản hồi xúc giác dứt khoát (Tactile transitions) trên mỗi nút bấm, thanh kéo thẻ và popup chi tiết.

**Key Characteristics:**
- **Nhận diện trạng thái tức thời:** Hệ thống phân định màu sắc trực quan (Sáng - Hổ phách, Chiều - Xanh lam, Tối - Xám phiến đá, Đủ người - Xanh lá, Thiếu người - Đỏ).
- **Trật tự & Cân bằng (Clockwork Rhythm):** Lưới phân chia ngày và nhân sự đều tăm tắp, độ dày viền 1px nhất quán, loại bỏ hoàn toàn các yếu tố trang trí dư thừa.
- **Tương tác chắc tay (Tactile Controls):** Mọi nút bấm và tương tác chuyển trạng thái đều có bước hạ thấp scale `active:scale-[0.985]`, mang lại cảm giác công cụ vật lý chân thực.
- **Thích ứng nhạy bén (Responsive Precision):** Hiển thị dạng ma trận đa chiều (Resource Calendar) trên màn hình máy tính và chuyển dịch mượt mà sang dạng thẻ cuộn tuyến tính trên thiết bị di động.

---

## Colors

Bảng màu của DutyFlow lấy sắc xanh hoàng gia tin cậy (`#2563eb`) làm trục dẫn lối, phối hợp cùng hệ màu chức năng phân cấp nghiêm ngặt nhằm báo hiệu tình trạng trực mà không gây quá tải thị giác.

### Primary
- **Cobalt Precision** (`#2563eb`): Màu nhận diện thương hiệu và hành động chính (Primary CTA, trạng thái active của menu, chỉ báo vị trí hiện tại).
- **Deep Cobalt** (`#1d4ed8`): Trạng thái hover của các thành phần tương tác chính.
- **Midnight Cobalt** (`#1e40af`): Trạng thái active/nhấn giữ của nút bấm chính.
- **Cobalt Ice** (`#eff6ff`): Màu nền phụ cho các huy hiệu trạng thái xác nhận, nền dòng được chọn hoặc chip thông tin kích hoạt.

### Shifts (Ca trực chuyên dụng)
- **Amber Sun** (`#f59e0b`, nền `#fffbeb`): Đại diện cho **Ca sáng** (07:00 – 11:00) – màu vàng ấm của bình minh, nổi bật nhưng dịu mắt.
- **Sky Meridian** (`#2563eb`, nền `#eff6ff`): Đại diện cho **Ca chiều** (13:00 – 17:00) – màu xanh trời sáng trong, chỉ thị sự tập trung cao độ.
- **Slate Twilight** (`#64748b`, nền `#f1f5f9`): Đại diện cho **Ca tối / Ca đêm** (18:00 – 22:00) – sắc xám phiến đá trầm lắng, biểu thị nhịp trực tĩnh.

### Status & Semantics
- **Emerald Vigilance** (`#16a34a`, nền `#f0fdf4`): Biểu thị ca đã xác nhận, ca đủ quân số, trạng thái duyệt thành công.
- **Warning Amber** (`#f59e0b`, nền `#fffbeb`): Biểu thị ca chờ xác nhận, cảnh báo hạn mức, yêu cầu đổi ca đang chờ xử lý.
- **Alert Crimson** (`#ef4444`, nền `#fef2f2`): Biểu thị ca thiếu người, ca bị từ chối/hủy bỏ, hành động xóa dữ liệu nguy hiểm.

### Neutral
- **Deep Ink** (`#111827`): Tiêu đề chính, số liệu thống kê lớn, nhãn cột then chốt. Đảm bảo độ tương phản tối đa (16:1) trên nền trắng.
- **Sub Ink** (`#6b7280`): Văn bản phụ, chú thích, nhãn biểu mẫu, trạng thái thứ cấp.
- **Faint Ink** (`#9ca3af`): Chữ giữ chỗ (placeholder), đường viền ngắt quãng, biểu tượng thụ động.
- **Edge Slate** (`#e5e7eb`): Đường viền cấu trúc của thẻ, bảng và các ô lịch.
- **Edge Soft** (`#f0f1f3`): Đường phân cách nội bộ giữa các dòng dữ liệu.
- **Clean Surface** (`#ffffff`): Mặt thẻ hiển thị nội dung, thanh điều hướng, modal.
- **Cool Canvas** (`#f7f8fa`): Màu nền gốc toàn ứng dụng, tạo sự tương phản mềm mại với thẻ trắng.

### Named Rules
**The 3-Second State Rule.** Mọi ô lịch hoặc thẻ ca trực đều phải truyền tải được 3 thông số: Khung giờ ca (màu chấm), Tình trạng nhân sự (màu viền/badge), và Trạng thái xác nhận trong vòng 3 giây quan sát đầu tiên.  
**The Scarcity of Red Rule.** Sắc đỏ cảnh báo (`#ef4444`) chỉ được xuất hiện khi có sự cố nghiêm trọng: ca trực thiếu người bắt buộc hoặc thao tác hủy không thể phục hồi. Không dùng màu đỏ cho các cảnh báo thông tin thông thường.

---

## Typography

Hệ thống sử dụng phông chữ **Inter** – chuẩn mực của các hệ thống hiển thị dữ liệu bảng biểu quốc tế, tích hợp cơ chế `tabular-nums` cho toàn bộ số liệu thời gian và định lượng.

**Display Font:** Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif  
**Body Font:** Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif  
**Tabular Mono:** Inter (với thuộc tính `font-variant-numeric: tabular-nums`) hoặc font-mono cho mã ca trực

**Character:** Chuẩn xác, mạch lạc, không chân phương tây hiện đại; nhấn mạnh vào tính dễ đọc ở cỡ chữ nhỏ (11px – 13.5px) trên màn hình làm việc mật độ cao.

### Hierarchy
- **Display** (Bold 700, 24px, line-height 1.2, tracking -0.02em): Dùng cho tiêu đề trang lớn nhất (`h1`), lời chào màn hình tổng quan.
- **Headline / Section** (Bold 700, 18px, line-height 1.3, tracking -0.015em): Dùng cho tiêu đề cụm biểu đồ, tên bảng phân ca tháng.
- **Title / Modal Header** (SemiBold 600, 15px - 16px, line-height 1.4): Dùng cho tiêu đề hộp thoại (Modal), thanh trượt (Drawer), tên phân nhóm nhân sự.
- **Body** (Regular 400 hoặc Medium 500, 13.5px, line-height 1.5): Dùng cho nội dung văn bản chính, ô nhập liệu biểu mẫu, thông báo chi tiết.
- **Label / Micro** (SemiBold 600, 11px - 12.5px, line-height 1.4, tracking wide): Dùng cho huy hiệu trạng thái (Badges), thẻ ca trực (ShiftTag), tên ngày trong tuần trên tiêu đề lịch.

### Named Rules
**The Tabular Precision Rule.** Bất kỳ giá trị nào liên quan đến giờ giấc (VD: `07:00 - 11:00`), số ca trực (`8/10 ca`), ngày tháng hoặc phần trăm tải việc bắt buộc phải áp dụng class `.tnum` (`font-variant-numeric: tabular-nums`) để triệt tiêu hiện tượng rung giật giao diện khi cập nhật số liệu thời gian thực.

---

## Layout

Cấu trúc lưới của DutyFlow được thiết kế cho nhịp độ làm việc liên tục của người vận hành:

- **Mô hình Khung (AppShell Architecture):**
  - **Sidebar Máy tính:** Cố định bên trái, độ rộng mặc định `240px`, có thể thu gọn xuống `72px` (icon mode) để tối đa hóa không gian quan sát lưới lịch trực.
  - **Top Navigation Bar:** Cao `64px` (`h-16`), cố định phía trên với hiệu ứng bán trong suốt `backdrop-blur bg-surface/95`, chứa breadcrumb trang, phím tắt tìm kiếm nhanh `⌘K`, chuông thông báo Zalo và thẻ thông tin tài khoản.
  - **Khu vực Nội dung (Main Content View):** Đặt trên nền `bg-canvas` với padding thích ứng (`p-4 sm:p-6 lg:p-8`), tự động co giãn theo chiều ngang để vừa vặn màn hình từ laptop 13" đến màn hình siêu rộng 4K.
  - **Điều hướng Di động (Mobile Bottom / Overlay):** Thanh điều hướng dưới đáy màn hình cho nhân viên tra cứu nhanh, kết hợp drawer trượt từ cạnh trái khi cần quản lý cấu hình.
- **Nhịp khoảng cách (Spacing Scale):**
  - Sử dụng hệ bước 4px: `4px (xs)`, `8px (sm)`, `12px`, `16px (md)`, `20px`, `24px (lg)`, `32px (xl)`.
  - Khoảng cách giữa các thẻ chỉ số (StatCard): `gap-4 sm:gap-5`.
  - Khoảng cách giữa các trường trong biểu mẫu: `space-y-4`.

---

## Elevation & Depth

DutyFlow áp dụng phong cách **Layered & Tactile (Phẳng đa tầng tinh tế)**:

Hệ thống nói không với đổ bóng giả lập 3D thô thiển; thay vào đó, độ sâu được tạo ra bằng 3 tầng mặt phẳng:
1. **Mặt sàn (Canvas):** Nền màu xám dịu `#f7f8fa`.
2. **Mặt nổi tĩnh (Card Surface):** Nền màu trắng tinh khiết `#ffffff`, ngăn cách với sàn bằng đường viền 1px `#e5e7eb` và đổ bóng vi mô `--shadow-card`.
3. **Mặt tương tác động (Floating Layers):** Nâng cao khi di chuột hoặc mở lớp che (Modal, Drawer, Popover) với đổ bóng đa lớp chống chói.

### Shadow Vocabulary
- **Card Rest** (`--shadow-card: 0 1px 2px rgb(17 24 39 / 0.04)`): Sử dụng cho tất cả thẻ tĩnh, bảng biểu ở trạng thái nghỉ.
- **Card Lift** (`--shadow-lift: 0 1px 2px rgb(17 24 39 / 0.05), 0 4px 12px -2px rgb(17 24 39 / 0.08)`): Kích hoạt khi di chuột qua thẻ số liệu thống kê hoặc ô lịch kéo thả, báo hiệu khả năng tương tác.
- **Floating Overlay** (`--shadow-pop: 0 12px 40px -8px rgb(17 24 39 / 0.18), 0 4px 12px rgb(17 24 39 / 0.06)`): Sử dụng cho Modal trung tâm, thanh trượt Drawer bên phải và ô tìm kiếm toàn cục.

### Named Rules
**The Active Elevation Rule.** Khi người dùng bắt đầu kéo thả một phân công ca trực (`dragging`), thẻ phân công phải tăng tức thì độ cao đổ bóng lên `--shadow-pop` và xoay nhẹ `rotate-1` để biểu thị trạng thái đang nhấc khỏi mặt bàn làm việc.

---

## Shapes

Ngôn ngữ hình khối của DutyFlow đề cao tính công thái học và sự an tâm:

- **Bán kính bo góc (Corner Radii):**
  - **Điều khiển nhỏ & Huy hiệu (`rounded-[6px]` đến `rounded-[8px]`):** Phù hợp cho ShiftTag, Status Badge, nút kích thước nhỏ, ô nhập ngày.
  - **Thành phần tương tác tiêu chuẩn (`rounded-[10px]`):** Nút bấm tiêu chuẩn (Button `h-10`), ô nhập liệu (Input/Select `h-10`), bộ tăng giảm số lượng (Stepper).
  - **Thẻ chứa & Khung hiển thị (`rounded-[14px]`):** Thẻ thống kê (StatCard), bảng tổng hợp ca trực, khung lịch tháng.
  - **Hộp thoại nổi (`rounded-2xl` / `16px`):** Modal trung tâm (bo 4 góc), Mobile Drawer (bo tròn 2 góc trên `rounded-t-2xl`).
  - **Huy hiệu tròn tuyệt đối (`rounded-full`):** Avatar nhân viên, nút gạt công tắc (Toggle), chấm trạng thái trực tuyến (Pulse dot).

---

## Components

Tất cả thành phần dùng chung được tập trung tại `client/src/components/ui.tsx` với thiết kế thống nhất và khả năng truy cập cao (A11y).

### Buttons
- **Shape:** Bo góc công thái học `rounded-[10px]`, chiều cao chuẩn `h-10 (md)`, `h-8.5 (sm)`, `h-7 (xs)`.
- **Primary:** Nền xanh `bg-brand-600` (`#2563eb`), chữ trắng `text-white`, đổ bóng nhấn nhẹ `shadow-[0_1px_2px_rgb(37_99_235/0.35)]`. Hover chuyển sang `#1d4ed8`, click hạ scale `active:scale-[0.985]`.
- **Secondary:** Nền trắng `bg-surface`, viền `border-edge`, chữ xám đậm `text-gray-700`. Hover chuyển nền `#f9fafb` và viền `#d1d5db`.
- **Danger / DangerSoft:** Nền đỏ dứt khoát `bg-red-500` cho hành động nguy hiểm; nền mềm `bg-red-50 text-red-600` cho nút từ chối duyệt ca.

### Chips & Shift Tags
- **ShiftTag:** Đại diện cho loại ca trực (`Ca sáng`, `Ca chiều`, `Ca tối`). Kết hợp chấm tròn chỉ báo màu sắc (`h-1.5 w-1.5 rounded-full`), tên ca và khung giờ dạng mono `tabular-nums`.
- **Status Badges:** Khung viền mỏng kèm icon phụ trợ trực quan:
  - `DRAFT` (Xám nháp kèm icon Đồng hồ),
  - `CONFIRMED` (Xanh lục kèm icon Dấu kiểm tròn),
  - `LOCKED` (Xám khóa kèm icon Ổ khóa),
  - `CANCELLED` (Đỏ kèm icon Cấm).
- **ZaloBadge:** Huy hiệu chuyên dụng hiển thị trạng thái đồng bộ hóa tài khoản Zalo của nhân viên (`Đã kết nối` - xanh Zalo, `Chưa kết nối` - xám nhạt).

### Cards / Containers
- **StatCard:** Thẻ chỉ số hiển thị ở trang Tổng quan và đầu trang Lịch trực. Chứa nhãn phụ đề, số liệu hiển thị lớn 28px, biểu tượng trong nền màu nhẹ bo tròn 10px, và xu hướng biến động phần trăm.
- **Card Border & Padding:** Viền đồng nhất 1px `border-edge`, đệm trong chuẩn `p-5` hoặc `p-6`.

### Inputs / Fields
- **Field Wrapper:** Bao bọc nhãn bên trên (`text-[12.5px] font-semibold text-gray-700`), gợi ý bên phải và dòng cảnh báo lỗi màu đỏ kèm icon `AlertTriangle`.
- **Input & Select:** Chiều cao chuẩn 40px (`h-10`), viền `#e5e7eb`, nền trắng. Hiệu ứng focus: viền chuyển sang xanh `#3b82f6` kèm viền hào quang kép `focus:ring-2 focus:ring-brand-500/25`.

### Navigation & AppShell
- **NavLink:** Thanh điều hướng chính với icon căn lề bên trái, chuyển nền `bg-blue-50 text-brand-700 font-semibold` khi đang mở trang đó.
- **Command Palette:** Tích hợp phím tắt `⌘K` / `Ctrl+K` để tìm kiếm nhân sự và chuyển nhanh đến các chức năng.

### Signature Component: Resource Calendar Row & Cell
- **Cấu trúc:** Cột đầu cố định hiển thị thông tin nhân viên (Avatar tròn chữ cái tên, họ tên đậm, chức vụ, bộ đếm số ca hiện tại dạng `X/10 ca`). Các cột tiếp theo hiển thị các ngày trong tháng.
- **Trạng thái ô:** Ô ngày nghỉ phép (sọc chéo mờ mờ `bg-stripes` hoặc xám), ô có ca trực (hiển thị thẻ ShiftTag kéo thả được), ô thiếu người trực (viền đứt đoạn màu hổ phách cảnh báo).

---

## Do's and Don'ts

### Do:
- **Do** luôn bọc toàn bộ giờ giấc, số ca trực và ngày tháng trong class `.tnum` (`tabular-nums`) để bảng không bị xô lệch vị trí.
- **Do** sử dụng `Modal` cho các thao tác xác nhận ngắn gọn và dùng `Drawer` trượt từ cạnh phải cho các biểu mẫu tạo ca hoặc chỉnh sửa chi tiết phức tạp.
- **Do** đảm bảo mọi nút bấm đều có hiệu ứng `focus-visible` với viền xanh 2px và khoảng cách đệm 2px cho người dùng thao tác phím.
- **Do** thể hiện đầy đủ trạng thái Loading (Skeleton shimmer hoặc vòng xoay Loader2) thay vì để màn hình trắng khi tải dữ liệu từ máy chủ.

### Don't:
- **Don't** tự ý thêm các màu sắc trang trí nằm ngoài bảng màu quy chuẩn (không dùng tím, hồng neon, xanh nõn chuối cho các trạng thái ca trực).
- **Don't** sử dụng cỡ chữ dưới 11px cho bất kỳ nhãn nào, đảm bảo nhân viên xem ca trên điện thoại không phải phóng to màn hình.
- **Don't** ẩn đi thông tin số ca trực tối đa của nhân viên (quy tắc 10 ca/tháng) trong lúc phân ca thủ công hoặc tự động.
- **Don't** sử dụng hiệu ứng bóng đổ nặng nề (heavy black shadows) trên nền canvas; chỉ sử dụng hệ bóng đổ đã được tính toán trong CSS variables.
