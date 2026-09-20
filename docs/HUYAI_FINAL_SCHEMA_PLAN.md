# HUYAI FINAL SCHEMA PLAN — HUY TECHNOLOGY AI CENTER V1.1
## RECONCILED PRE-MIGRATION SPECIFICATION (PHASE 06D)

**Trạng thái:** DỰ THẢO CUỐI CÙNG — ĐÃ ĐỐI SOÁT TOÀN DIỆN (CHỜ PHÊ DUYỆT CỦA CON NGƯỜI)  
**Dự án Supabase mục tiêu:** `HuyAI` (Region: Singapore, Project Ref: `bdeluacbzbdflxubhpha`)  
**DDL ÁP DỤNG TRÊN PRODUCTION:** **ZERO (CHƯA CHẠY BẤT KỲ MIGRATION NÀO)**

---

## 1. Toàn Bộ Kiểm Kê 19 Bảng Hiện Hữu Trên HuyAI (Live Table Inventory: 19)

Kiểm toán trực tiếp môi trường Supabase `HuyAI` Singapore ghi nhận chính xác **19 bảng** trong schema `public`:

| STT | Tên Bảng Hiện Hữu | Mục Đích Nghiệp Vụ Hiện Tại | Hiện Trạng RLS | Đánh Giá Tái Sử Dụng Cho AI Center |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **`contacts`** | Danh bạ liên hệ khách hàng & đối tác | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 2 | **`videos`** | Danh mục video bài giảng & Youtube | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 3 | **`resources`** | Kho học liệu, giáo trình, tài liệu số | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 4 | **`resource_views`** | Bộ đếm lượt xem tài liệu học tập | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 5 | **`premium_contents`**| Nội dung trả phí khóa học EdTech | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 6 | **`item_reviews`** | Đánh giá sao, nhận xét của học viên | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 7 | **`audit_logs`** | Nhật ký thao tác hệ thống (id, user_id, user_email, user_name, action_type, target_resource, details, created_at) | Enabled | **TÁI SỬ DỤNG CÓ GIỚI HẠN:** Chỉ dùng cho user/admin actions và security events có danh tính người dùng thực. Không nhồi nhét runtime/node telemetry. Mở rộng bằng `ADD COLUMN IF NOT EXISTS`. |
| 8 | **`user_activity_metrics`** | Chỉ số đo lường phiên tương tác web | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 9 | **`student_points_balance`** | Sổ cái tích điểm gamification học viên (email, points, redeemed_courses, streak) | Enabled | **TÁI SỬ DỤNG CHO HỌC TẬP:** Không can thiệp, không gộp lẫn lộn với AI Center. |
| 10 | **`daily_tasks`** | Nhiệm vụ học tập hàng ngày của học sinh (đọc sách, xem video, điểm danh) | Enabled | **GIỮ NGUYÊN:** Phục vụ gamification học sinh. Khác biệt hoàn toàn với `ai_tasks` (hàng đợi xử lý model). |
| 11 | **`task_completions`**| Lịch sử hoàn thành nhiệm vụ học tập | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 12 | **`cms_folders`** | Cấu trúc cây thư mục tài liệu CMS | Enabled | **GIỮ NGUYÊN:** AI Center không tạo bảng folder trùng lặp. |
| 13 | **`orders`** | Đơn hàng thanh toán khóa học VietQR ACB | Enabled | **KHÔNG DÙNG CHO AI USAGE:** Giữ nguyên 100% mục đích đơn hàng/thanh toán hiện tại. Không dùng cho AI compute consumption, token usage, job credit deduction hay model usage accounting. |
| 14 | **`cms_settings`** | Cấu hình cài đặt giao diện / CMS | Enabled (No policies) | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 15 | **`knowledge_chunks`**| Phân mảnh tri thức vector phục vụ RAG (có extension `pgvector` và hàm `match_knowledge_chunks`) | Enabled (Multiple policies) | **TÁI SỬ DỤNG CHO AI RAG:** Tái sử dụng bảng vector này, không tạo bảng tri thức mới. |
| 16 | **`user_video_progress`** | Tiến độ thời lượng xem video của học viên | Enabled (No policies) | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 17 | **`user_document_progress`** | Tiến độ trang đọc tài liệu của học viên | Enabled (No policies) | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 18 | **`leads`** | Khách hàng tiềm năng để lại thông tin | Enabled (No policies) | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 19 | **`site_content`** | Nội dung trang landing page động | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |

---

## 2. Tiện Ích Mở Rộng & Hàng Đợi (Extensions & PGMQ Queue)
- **`pgvector`:** Đã cài đặt và đang phục vụ `public.knowledge_chunks`.
- **`pgmq`:** Khả dụng trong database (phiên bản `1.5.1`), chưa cài đặt. Migration 05 sẽ chạy lệnh `CREATE EXTENSION IF NOT EXISTS pgmq;`.
- **Queue Architecture (Durable Basic Queue):**
  - Queue `ai-jobs` được khởi tạo qua `pgmq.create('ai-jobs')` — đây là **Durable Basic Queue** (được ghi log WAL đầy đủ, không phải unlogged queue).
  - Queue tiêu thụ độc quyền ở phía server-side qua thông tin xác thực của Dispatcher. **Tuyệt đối không cấp quyền hoặc mở `pgmq_public` cho trình duyệt / client**.
- **Redis:** **KHÔNG SỬ DỤNG (0%)**.
- **Bảng Custom Queue:** **KHÔNG SỬ DỤNG (Loại bỏ `queue_messages`)**.

---

## 3. Chính Sách Nghiệp Vụ V1: Hoãn Hệ Thống AI Credit (AI Credit System: Deferred)
- Bảng `public.orders` **KHÔNG** được sử dụng cho việc trừ credit, tiêu hao token hay hạch toán tài nguyên AI.
- Hệ thống AI Credit Accounting được **HOÃN LẠI (DEFERRED)** trong V1.
- Không tạo bảng credit/wallet trong đợt migration này. Mọi cơ chế hạch toán hạn mức tính toán trong tương lai sẽ được thiết kế riêng biệt và độc lập.

---

## 4. Phạm Vi Tái Sử Dụng Bảng audit_logs (User/Admin Audit Only)
- `public.audit_logs` **chỉ** được sử dụng để ghi nhận các hành vi của người dùng (user actions), hành vi của quản trị viên (admin actions) hoặc các sự kiện bảo mật có danh tính tài khoản hợp lệ.
- **Không nhồi nhét sự kiện hệ thống/node runtime vào `audit_logs`:**
  - Trạng thái máy chủ -> lưu tại `public.nodes` và `public.node_heartbeats`.
  - Sự kiện runtime worker -> lưu tại structured JSON logs của Dispatcher daemon trên node Dell M4800.
- Không nới lỏng các ràng buộc `NOT NULL` hiện có của bảng `audit_logs`.

---

## 5. Danh Mục Bảng Mới Chính Xác: 15 Bảng (New AI Center Tables: 15)

1. **AI Operations (3 bảng):**
   - `public.ai_tasks`: Hàng đợi điều phối công việc AI bất đồng bộ.
   - `public.ai_task_steps`: Các bước chi tiết trong pipeline xử lý.
   - `public.ai_outputs`: Kết quả suy luận có cấu trúc, token telemetry và độ trễ.
2. **Infrastructure (2 bảng):**
   - `public.nodes`: Danh bạ máy chủ xử lý AI (seed idempotent `huy-ai-node-01`).
   - `public.node_heartbeats`: Nhật ký đo lường CPU, RAM, Disk, Queue depth.
3. **AI Registry (7 bảng — Tạo hoàn toàn trống, không seed catalog):**
   - `public.ai_providers`
   - `public.ai_models`
   - `public.tools`
   - `public.tool_versions`
   - `public.tool_capabilities`
   - `public.agents`
   - `public.agent_versions`
4. **GitHub Radar (3 bảng — Server-Only, Service-Role Access Only):**
   - `public.github_projects`
   - `public.github_reviews`
   - `public.github_versions`

*Tất cả 15 bảng mới đều có RLS Enabled, chỉ mục khóa ngoại đầy đủ, và tuân thủ UUID primary key.*
