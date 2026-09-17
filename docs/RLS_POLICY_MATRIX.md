# ROW LEVEL SECURITY (RLS) POLICY MATRIX — HUY TECHNOLOGY AI CENTER

Tài liệu ma trận phân quyền dữ liệu tầng cơ sở dữ liệu (Row Level Security) trên Supabase.

---

## 1. Nguyên tắc Phân quyền Cốt lõi (Core Principles)

1. **User Ownership:** Người dùng thông thường chỉ có quyền đọc/sửa dữ liệu thuộc quyền sở hữu của cá nhân (`auth.uid() = profile_id`).
2. **Organization Scoping:** Thành viên tổ chức (trường học, doanh nghiệp) chỉ truy cập dữ liệu của tổ chức mình thông qua hàm kiểm tra `is_org_member(org_id)`.
3. **Role Elevation:** Các thao tác cấu hình tổ chức, quản lý thành viên hoặc xem nhật ký kiểm toán yêu cầu quyền `admin` hoặc `owner`.
4. **Server-Side Exclusivity:** Mọi thao tác hàng đợi (claim task), ghi log hệ thống, cập nhật ví tín dụng đều được kiểm soát nghiêm ngặt qua `service_role` (Backend / Worker nội bộ).

---

## 2. Ma trận Phân quyền theo Bảng (RLS Matrix)

| Bảng dữ liệu | Vai trò / Role | SELECT | INSERT | UPDATE | DELETE | Ghi chú điều kiện RLS |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **`profiles`** | `anon` | ❌ | ❌ | ❌ | ❌ | Bị chặn hoàn toàn |
| | `authenticated` | ✅ (Own) | ✅ (Own) | ✅ (Own) | ❌ | `id = auth.uid()` |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Toàn quyền |
| **`organizations`** | `authenticated` | ✅ (Member) | ✅ | ✅ (Admin/Owner) | ❌ | Phân quyền theo `is_org_member` |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Toàn quyền |
| **`organization_members`** | `authenticated` | ✅ (Member) | ✅ (Admin/Owner) | ✅ (Owner) | ✅ (Admin/Owner) | Thành viên chỉ xem danh sách đồng nghiệp |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Toàn quyền |
| **`plans`** | `anon` / `authenticated` | ✅ (Active) | ❌ | ❌ | ❌ | Công khai các gói đang kích hoạt |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Quản trị gói cước |
| **`subscriptions`** | `authenticated` | ✅ (Owner/Member) | ❌ | ❌ | ❌ | Đọc gói thuê bao của tổ chức mình |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Cập nhật thanh toán |
| **`credit_wallets`** | `authenticated` | ✅ (Owner/Member) | ❌ | ❌ | ❌ | Đọc số dư ví của cá nhân hoặc tổ chức |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Nạp tiền, trừ tiền giao dịch |
| **`credit_transactions`** | `authenticated` | ✅ (Owner/Member) | ❌ | ❌ | ❌ | Xem lịch sử tiêu hao tín dụng |
| | `service_role` | ✅ | ✅ | ❌ | ❌ | Ghi nhận giao dịch (Append-only) |
| **`ai_tasks`** | `authenticated` | ✅ (Own/Org) | ✅ (Own/Org) | ❌ | ❌ | Client chỉ tạo và xem task của mình |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Worker claim và cập nhật kết quả |
| **`ai_task_steps`** | `authenticated` | ✅ (Task owner) | ❌ | ❌ | ❌ | Đọc các bước của task mình sở hữu |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Worker cập nhật tiến độ bước |
| **`ai_outputs`** | `authenticated` | ✅ (Task owner) | ❌ | ❌ | ❌ | Đọc kết quả của task mình sở hữu |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Worker lưu kết quả đầu ra |
| **`ai_providers`** | `anon` / `authenticated` | ✅ (Active) | ❌ | ❌ | ❌ | Đọc danh mục backend đang online |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Cấu hình nhà cung cấp |
| **`ai_models`** | `anon` / `authenticated` | ✅ (Active) | ❌ | ❌ | ❌ | Đọc danh mục model khả dụng |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Quản lý model catalog |
| **`tools` & `agents`** | `anon` / `authenticated` | ✅ (Active) | ❌ | ❌ | ❌ | Đọc danh mục tool và agent công khai |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Đăng ký công cụ mới |
| **`nodes`** | `authenticated` | ✅ | ❌ | ❌ | ❌ | Đọc trạng thái node phục vụ giám sát |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Heartbeat daemon cập nhật trạng thái |
| **`node_heartbeats`** | `authenticated` | ✅ | ❌ | ❌ | ❌ | Xem telemetry phục vụ Dashboard |
| | `service_role` | ✅ | ✅ | ❌ | ❌ | Daemon ghi nhận chỉ số tải |
| **`audit_logs`** | `authenticated` | ✅ (Admin/Actor) | ❌ | ❌ | ❌ | Xem log liên quan đến bản thân/tổ chức |
| | `service_role` | ✅ | ✅ | ❌ | ❌ | Append-only (Không ai được UPDATE/DELETE) |
| **`queue_messages`** | `authenticated` | ❌ | ❌ | ❌ | ❌ | Bị ẩn hoàn toàn với client |
| | `service_role` | ✅ | ✅ | ✅ | ✅ | Quản lý hàng đợi nền |
