# HUYAI ROW-LEVEL SECURITY (RLS) MATRIX & ACCESS CONTROL

**Trạng thái:** TÀI LIỆU MA TRẬN BẢO MẬT & KIỂM SOÁT QUYỀN TRUY CẬP (V1.1)  
**Mục tiêu:** Đảm bảo 100% bảng mới và bảng mở rộng được bật RLS, ngăn ngừa rò rỉ dữ liệu giữa người dùng, khóa chặt `service_role` ở tầng backend, và thiết lập `SET search_path = public, pg_temp` trên tất cả các stored procedures.

---

## 1. Ma Trận Quyền Truy Cập (RLS Matrix)

| Tên Bảng | RLS Bắt Buộc | Quyền Anonymous (Khách / Chưa đăng nhập) | Quyền Authenticated (Người dùng đăng nhập) | Quyền Service Role (Worker / Server Backend) | Ghi Chú Bảo Mật |
| :--- | :---: | :--- | :--- | :--- | :--- |
| **`ai_tasks`** | **BẬT (ENABLED)** | **KHÔNG TRUY CẬP** | **SELECT / INSERT**: Chỉ đọc và tạo task do chính mình sở hữu (`user_id = auth.uid()`). Không thể cập nhật trạng thái trực tiếp. | **TOÀN QUYỀN (ALL)** | Ngăn chặn người dùng sửa status hoặc xem bài tập/giáo án của người khác. |
| **`ai_task_steps`** | **BẬT (ENABLED)** | **KHÔNG TRUY CẬP** | **SELECT**: Chỉ xem bước của task thuộc quyền sở hữu của mình (`EXISTS ai_tasks`). | **TOÀN QUYỀN (ALL)** | Chỉ có Dispatcher Worker mới cập nhật tiến độ từng bước. |
| **`ai_outputs`** | **BẬT (ENABLED)** | **KHÔNG TRUY CẬP** | **SELECT**: Chỉ xem kết quả sinh ra từ task của chính mình. | **TOÀN QUYỀN (ALL)** | Kết quả AI được bảo vệ nghiêm ngặt, không công khai. |
| **`nodes`** | **BẬT (ENABLED)** | **KHÔNG TRUY CẬP** | **SELECT**: Đọc thông tin công khai an toàn (tên node, trạng thái online/offline, khả năng xử lý). | **TOÀN QUYỀN (ALL)** | Chỉ node Dell M4800 dùng service_role mới cập nhật heartbeat và trạng thái tải. |
| **`node_heartbeats`** | **BẬT (ENABLED)** | **KHÔNG TRUY CẬP** | **SELECT**: Đọc thông số telemetry phục vụ bảng điều khiển giám sát. | **TOÀN QUYỀN (ALL)** | Telemetry chỉ được ghi bởi Worker Node. |
| **`ai_providers`** | **BẬT (ENABLED)** | **SELECT** (`is_active = true`) | **SELECT** (`is_active = true`) | **TOÀN QUYỀN (ALL)** | Khóa API key và secret endpoint trong provider config không bao giờ trả về cho client. |
| **`ai_models`** | **BẬT (ENABLED)** | **SELECT** (`is_active = true`) | **SELECT** (`is_active = true`) | **TOÀN QUYỀN (ALL)** | Công khai danh sách model để frontend render dropdown chọn mô hình. |
| **`tools`** | **BẬT (ENABLED)** | **SELECT** (`status != 'deprecated'`) | **SELECT** (`status != 'deprecated'`) | **TOÀN QUYỀN (ALL)** | Danh mục 14 công cụ AI cho người dùng tra cứu. |
| **`tool_versions`** | **BẬT (ENABLED)** | **SELECT** | **SELECT** | **TOÀN QUYỀN (ALL)** | Đọc phiên bản và schema cấu hình. |
| **`tool_capabilities`**| **BẬT (ENABLED)** | **SELECT** | **SELECT** | **TOÀN QUYỀN (ALL)** | Đọc tính năng hỗ trợ của công cụ. |
| **`agents`** | **BẬT (ENABLED)** | **SELECT** (`is_active = true`) | **SELECT** (`is_active = true`) | **TOÀN QUYỀN (ALL)** | Danh mục Agent (Teacher AI, SmartTax AI, v.v.). |
| **`agent_versions`** | **BẬT (ENABLED)** | **SELECT** | **SELECT** | **TOÀN QUYỀN (ALL)** | Đọc phiên bản agent đang kích hoạt. |
| **`github_projects`** | **BẬT (ENABLED)** | **KHÔNG TRUY CẬP** | **SELECT**: Đọc các dự án AI đang được radar theo dõi. | **TOÀN QUYỀN (ALL)** | Radar scanner sử dụng service_role để cập nhật chỉ số sao, forks. |
| **`github_reviews`** | **BẬT (ENABLED)** | **KHÔNG TRUY CẬP** | **SELECT**: Đọc đánh giá kiến trúc & an toàn mã nguồn. | **TOÀN QUYỀN (ALL)** | Chỉ backend scanner mới ghi nhận kết quả đánh giá. |
| **`github_versions`** | **BẬT (ENABLED)** | **KHÔNG TRUY CẬP** | **SELECT**: Đọc các phiên bản phát hành mới. | **TOÀN QUYỀN (ALL)** | Cập nhật tự động qua service_role. |
| **`queue_messages`** | **BẬT (ENABLED)** | **KHÔNG TRUY CẬP** | **KHÔNG TRUY CẬP** | **TOÀN QUYỀN (ALL)** | Hàng đợi hoàn toàn cô lập ở tầng server-side, không mở endpoint trực tiếp cho browser. |
| **`audit_logs`** | **BẬT (ENABLED)** | **KHÔNG TRUY CẬP** | **SELECT**: Người dùng chỉ xem audit logs liên quan đến chính mình (`user_id = auth.uid()`). | **TOÀN QUYỀN (ALL)** | Bảo vệ nhật ký kiểm toán hệ thống. |

---

## 2. Tiêu Chuẩn Bảo Vệ Chống Tấn Công (Security Hardening Standards)

### 2.1. Ngăn Chặn Leo Thang Đặc Quyền (Search Path Hijacking Immunity)
Tất cả các hàm lưu trữ (Stored Procedures) có cờ `SECURITY DEFINER` bắt buộc phải có khai báo tường minh:
```sql
SET search_path = public, pg_temp;
```
Áp dụng cho:
- `claim_ai_task(p_worker_id TEXT)`
- `claim_queue_message(p_queue_name TEXT, p_worker_id TEXT, p_batch_size INTEGER)`

### 2.2. Khóa Ngoại và Chỉ Mục Hiệu Năng (Foreign Keys & Indexes)
Để tránh hiện tượng khóa toàn bảng (table-scan locks) trong PostgreSQL khi có thao tác xóa hoặc cập nhật cascade, tất cả các khóa ngoại đều được đánh chỉ mục chuyên biệt:
- `idx_ai_tasks_user_id` trên `public.ai_tasks(user_id)`
- `idx_ai_tasks_queue_poll` trên `public.ai_tasks(status, priority DESC, created_at ASC) WHERE status = 'queued'`
- `idx_ai_task_steps_task` trên `public.ai_task_steps(task_id, step_number ASC)`
- `idx_ai_outputs_task` trên `public.ai_outputs(task_id)`
- `idx_node_heartbeats_node` trên `public.node_heartbeats(node_id, created_at DESC)`
- `idx_ai_models_provider` trên `public.ai_models(provider_id)`
- `idx_queue_messages_poll` trên `public.queue_messages(queue_name, status, scheduled_for, priority DESC, created_at ASC) WHERE status = 'queued'`

### 2.3. Quy Định Tuyệt Đối Về Secret Key
- `SUPABASE_SERVICE_ROLE_KEY` chỉ được tồn tại trong môi trường Serverless runtime của Next.js Server Routes và worker daemon trên Dell Precision M4800.
- Client Frontend (`apps/control-center`) chỉ sử dụng `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
