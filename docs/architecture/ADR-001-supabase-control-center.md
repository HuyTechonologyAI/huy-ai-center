# ADR-001: Sử Dụng Dự Án Supabase Hiện Hữu (HuyAI Singapore) Làm Control Center

- **Trạng thái:** ACCEPTED (AUTHORITATIVE PATCH V1.1)
- **Ngày quyết định:** 18/09/2026
- **Người đề xuất:** Lead Software Architect & System Engineer
- **Phạm vi:** Cơ sở dữ liệu, Xác thực và Hàng đợi tập trung

---

## 1. Bối cảnh (Context)
Trong kiến trúc ban đầu (V1.0), một phương án từng được xem xét là khởi tạo một dự án Supabase độc lập mới mang tên `huy-ai-center-prod` dành riêng cho hệ thống AI Center.

Tuy nhiên, qua kiểm toán hệ thống thực tế và đánh giá tối ưu hóa chi phí (Cost-Optimized Architecture Patch V1.1):
- Hệ sinh thái đã có sẵn dự án Supabase đang hoạt động: **`HuyAI`** (Đặt tại khu vực Singapore).
- Việc mở thêm một dự án Supabase mới làm tăng chi phí định kỳ, phân mảnh cơ sở người dùng, gây khó khăn trong việc chia sẻ danh tính (Identity / Auth) và làm tăng độ phức tạp trong quản lý vận hành.

---

## 2. Quyết định (Decision)
1. **HỦY BỎ** việc tạo dự án Supabase mới (`huy-ai-center-prod`).
2. **CHUYỂN ĐỔI & MỞ RỘNG** dự án Supabase `HuyAI` (Singapore) trở thành **HUY TECHNOLOGY AI CONTROL CENTER**.
3. Toàn bộ các chức năng mới của AI Center (hàng đợi `ai_tasks`, bảng `nodes`, `ai_outputs`, `agents`, `tools`) sẽ được bổ sung vào cơ sở dữ liệu `HuyAI` thông qua các file SQL Migration có gắn số phiên bản rõ ràng (`SAFE VERSIONED MIGRATIONS`).
4. **Không tự ý di chuyển** dự án `smart-teacher-ai` vào `HuyAI` khi chưa qua quy trình kiểm toán 5 bước (Schema, Auth, Storage, Environment, Application dependencies) và sự phê duyệt rõ ràng của con người.

---

## 3. Lý do & Lợi ích (Rationale)
- **Tiết kiệm chi phí (Lower cost):** Không phát sinh thêm gói dịch vụ Supabase hàng tháng, giữ tổng chi phí đám mây dưới $30 USD/tháng.
- **Giảm số lượng dự án phân tán (Fewer active projects):** Quản lý tập trung tại một nơi duy nhất.
- **Tránh trùng lặp dữ liệu người dùng (Less duplicated auth/data):** Tái sử dụng bảng `profiles`, `auth.users` và logic phân quyền hiện có.
- **Kiến trúc tinh giản (Simpler architecture):** Dispatcher và các website vệ tinh chỉ cần cấu hình một bộ thông số kết nối Supabase tập trung.
- **Giảm tải bảo trì (Reduced maintenance):** Chỉ cần duy trì một quy trình sao lưu (backup) và khôi phục (restore) duy nhất.
- **Tích hợp dễ dàng (Easier integration):** Các website trong hệ sinh thái có thể truy vấn bảng tác vụ trực tiếp mà không cần liên kết chéo nhiều database (cross-database queries).

---

## 4. Rủi ro & Biện pháp giảm thiểu (Risks & Mitigations)
- **Rủi ro phạm vi ảnh hưởng chung (Shared blast radius):** Một lỗi trong cơ sở dữ liệu có thể ảnh hưởng đến cả trang web và AI Center.
  - *Biện pháp:* Áp dụng triệt để nguyên tắc **Zero-Touch**, cấm `DROP TABLE`, `TRUNCATE`, `ALTER destructive` khi chưa có phê duyệt riêng.
- **Kỷ luật Migration nghiêm ngặt (Migration discipline required):** Mọi thay đổi schema phải kiểm tra name collisions, dependencies và được review trước khi apply.
- **Tầm quan trọng của Row Level Security (RLS becomes critical):** Bắt buộc bật RLS trên 100% bảng mới và kiểm duyệt chặt chẽ quyền truy cập của từng role.
- **Tổ chức cấu trúc dữ liệu khoa học:** Đặt tên bảng và hàm với tiền tố rõ ràng (`ai_*`, `claim_ai_task`, `node_*`) để tránh xung đột với các bảng ứng dụng hiện hữu.
