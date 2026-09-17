# Phase 05 — Control Center Web Application Report

## 1. Tổng Quan Kiến Trúc Web
Control Center Web (`apps/control-center`) được thiết kế đóng vai trò bảng điều khiển trung tâm của toàn bộ hệ sinh thái HUY TECHNOLOGY AI CENTER.
- **Dự kiến triển khai**: `app.huycncdsai.io.vn` (Hiện đang cấu hình cho Vercel Preview / Staging, tuân thủ nghiêm ngặt nguyên tắc **Zero-Touch Production**, không thay đổi DNS của 3 website sản xuất).
- **Công nghệ cốt lõi**: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, Supabase Client & Server Handlers.
- **Nguyên tắc giao diện**: Tối giản, hiện đại, hỗ trợ toàn diện tiếng Việt, tự động thích ứng trên Desktop và Thiết bị di động (Mobile Drawer).

---

## 2. Danh Mục Các Màn Hình & Tuyến Điều Hướng

| Tuyến Đường (Route) | Tên Màn Hình | Mục Đích & Chức Năng |
|---|---|---|
| `/` | **Dashboard** | Bảng tổng quan hạ tầng, trạng thái 3 website vệ tinh, telemetry hàng đợi và nút mở nhanh Teacher AI. |
| `/apps` | **AI Apps** | Danh mục 4 ứng dụng cốt lõi: Teacher AI (Hoạt động), Student AI, SmartTax AI, Business AI. |
| `/apps/teacher-ai` | **Teacher AI Suite** | Mẫu nhập liệu nghiệp vụ sư phạm (Môn, Lớp, Tên bài, Số tiết, Yêu cầu) với 6 tùy chọn đầu ra (Giáo án CV 5512, Slide, Quiz, Mindmap, Phiếu học tập, Video Script). |
| `/tasks/[id]` | **Job UI** | Theo dõi trạng thái tác vụ theo thời gian thực (Queued, Processing, Completed, Failed), thông báo thân thiện khi Dell offline, mô phỏng thử nghiệm và xem 4 tab kết quả. |
| `/history` | **Lịch Sử Tác Vụ** | Bảng tra cứu toàn bộ tác vụ đã tạo với bộ lọc trạng thái và tìm kiếm mã tác vụ. |
| `/projects` | **Dự Án** | Không gian quản lý các bộ chuyên đề giáo án, ngân hàng đề và hồ sơ tư vấn theo môn học / niên khóa. |
| `/files` | **Kho Tệp & Học Liệu** | Quản lý tệp được lưu trữ trên 5 Supabase Storage Buckets (`lesson-plans`, `teaching-slides`, `evaluations`, `tax-documents`, `system-backups`). |
| `/credits` | **Hạn Mức & Ví Credits** | Theo dõi số dư ví (5,000 Credits), biểu phí các gói và cơ chế miễn phí 100% khi xử lý trên On-Premises Dell Node. |
| `/account` | **Hồ Sơ Quản Trị** | Quản lý tài khoản Super Admin, tổ chức, cụm máy chủ nội bộ và sao chép API Key kết nối vệ tinh. |

---

## 3. Khả Năng Chịu Lỗi & Decoupled Khi Dell Offline
- Khi người dùng gửi yêu cầu từ Teacher AI (`POST /api/ai/tasks`), tác vụ được ghi vào hàng đợi với trạng thái `queued`.
- Giao diện **Job UI** (`/tasks/[id]`) chủ động kiểm tra trạng thái máy chủ `dell-m4800`. Nếu máy chủ offline, hệ thống hiển thị thông báo an tâm:
  > *"Hệ thống máy chủ Dell Precision M4800 hiện đang ở trạng thái Standby. Tác vụ của bạn đã được ghi nhận an toàn vào hàng đợi và sẽ tự động xử lý ngay khi worker kết nối."*
- Ứng dụng **không bao giờ trả lỗi crash 500 hay báo lỗi sai sự thật** cho người dùng.

---

## 4. Kết Quả Kiểm Tra Xác Thực
- **TypeScript Compile (`tsc --noEmit`)**: 100% hợp lệ trên cả 5 workspaces (`@huy-ai/config`, `@huy-ai/contracts`, `@huy-ai/shared`, `@huy-ai/control-center`, `@huy-ai/dispatcher`).
- **Next.js Production Build (`next build`)**: Biên dịch thành công 14 routes tĩnh và động không có bất kỳ cảnh báo nghiêm trọng nào.
- **Bộ Kiểm Tra An Toàn (`npm run verify:safety`)**:
  - Không có file `.env` bị lộ trong git.
  - Không có secrets bị hardcode trong mã nguồn.
  - Toàn bộ 24/24 unit & integration tests vượt qua thành công.
