# HUYAI FINAL SCHEMA PLAN — HUY TECHNOLOGY AI CENTER V1.1
## RECONCILED PRE-MIGRATION SPECIFICATION (PHASE 06C)

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
| 7 | **`audit_logs`** | Nhật ký thao tác hệ thống (id, user_id, user_email, user_name, action_type, target_resource, details, created_at) | Enabled | **TÁI SỬ DỤNG & MỞ RỘNG AN TOÀN**: Mở rộng bằng `ADD COLUMN IF NOT EXISTS`. Không tạo bảng audit thứ hai. |
| 8 | **`user_activity_metrics`** | Chỉ số đo lường phiên tương tác web | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 9 | **`student_points_balance`** | Sổ cái tích điểm gamification học viên (email, points, redeemed_courses, streak) | Enabled | **TÁI SỬ DỤNG CHO HỌC TẬP**: Không can thiệp, không gộp lẫn lộn với hạn mức compute AI. |
| 10 | **`daily_tasks`** | Nhiệm vụ học tập hàng ngày của học sinh (đọc sách, xem video, điểm danh) | Enabled | **GIỮ NGUYÊN**: Phục vụ gamification học sinh. Khác biệt hoàn toàn với `ai_tasks` (hàng đợi xử lý model). |
| 11 | **`task_completions`**| Lịch sử hoàn thành nhiệm vụ học tập | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 12 | **`cms_folders`** | Cấu trúc cây thư mục tài liệu CMS | Enabled | **GIỮ NGUYÊN**: AI Center không tạo bảng folder trùng lặp. |
| 13 | **`orders`** | Đơn hàng mua khóa học VietQR ACB (id, user_id, user_email, amount, memo_code, status) | Enabled | **TÁI SỬ DỤNG CHO THANH TOÁN AI**: Hóa đơn mua AI credits sử dụng chung cấu trúc này. |
| 14 | **`cms_settings`** | Cấu hình cài đặt giao diện / CMS | Enabled (No policies) | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 15 | **`knowledge_chunks`**| Phân mảnh tri thức vector phục vụ RAG (có extension `pgvector` và hàm `match_knowledge_chunks`) | Enabled (Multiple policies) | **TÁI SỬ DỤNG CHO AI RAG**: Tái sử dụng bảng vector này, không tạo bảng tri thức mới. |
| 16 | **`user_video_progress`** | Tiến độ thời lượng xem video của học viên | Enabled (No policies) | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 17 | **`user_document_progress`** | Tiến độ trang đọc tài liệu của học viên | Enabled (No policies) | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 18 | **`leads`** | Khách hàng tiềm năng để lại thông tin | Enabled (No policies) | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 19 | **`site_content`** | Nội dung trang landing page động | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |

---

## 2. Tiện Ích Mở Rộng Trên HuyAI (Extensions Status)
- **`pgvector`:** Đã cài đặt và đang phục vụ `public.knowledge_chunks`.
- **`pgmq`:** Khả dụng trong database (phiên bản `1.5.1`), chưa cài đặt. Migration 05 sẽ chạy lệnh `CREATE EXTENSION IF NOT EXISTS pgmq;`.

---

## 3. Kiến Trúc Hàng Đợi Tinh Giản: PGMQ Only (Queue Architecture)
- **Quy tắc:** Chỉ sử dụng **Supabase Queues (pgmq)**.
- **Loại bỏ hoàn toàn:** Bảng tự tạo `public.queue_messages` và các hàm claim fallback.
- **Quy trình hàng đợi chuẩn:**
  ```text
  Client / Web App
        │
        ▼ (POST /api/ai/tasks)
  Bảng public.ai_tasks ──(Enqueue)──► PGMQ Queue: ai-jobs
                                             │
                                             ▼ (pgmq.read / claim_ai_task)
                                   Dell Precision M4800
                                  (apps/dispatcher worker)
  ```
- **Redis:** **KHÔNG SỬ DỤNG (0%)**.

---

## 4. Xóa Bỏ Dữ Liệu Seed Danh Mục (No Business Catalog Seeds)
- Migration 03 (`ai_registry.sql`) được làm sạch hoàn toàn:
  - **KHÔNG SEED** 14 open-source tools.
  - **KHÔNG SEED** 4 AI models.
  - **KHÔNG SEED** speculative providers.
  - **KHÔNG SEED** speculative agents.
  - Toàn bộ các bảng registry (`ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`) được tạo **HOÀN TOÀN TRỐNG**.
- Migration 02 (`infrastructure.sql`):
  - Duy trì duy nhất bản ghi idempotent cho `huy-ai-node-01` vì máy chủ vật lý Dell Precision M4800 đã online thực tế.

---

## 5. Tổng Hợp Các Bảng Mới Sẽ Tạo (New AI Center Tables: 12)

1. **AI Operations:**
   - `public.ai_tasks`: Hàng đợi điều phối công việc AI bất đồng bộ.
   - `public.ai_task_steps`: Các bước chi tiết trong pipeline xử lý.
   - `public.ai_outputs`: Kết quả suy luận có cấu trúc, token usage và độ trễ.
2. **Infrastructure:**
   - `public.nodes`: Danh bạ máy chủ xử lý AI (`huy-ai-node-01`).
   - `public.node_heartbeats`: Nhật ký đo lường CPU, RAM, Disk, Queue depth.
3. **AI Registry:**
   - `public.ai_providers`
   - `public.ai_models`
   - `public.tools`
   - `public.tool_versions`
   - `public.tool_capabilities`
   - `public.agents`
   - `public.agent_versions`
4. **GitHub Radar:**
   - `public.github_projects`
   - `public.github_reviews`
   - `public.github_versions`

*Tất cả 12 bảng mới đều có RLS Enabled, chỉ mục khóa ngoại đầy đủ, và tuân thủ UUID primary key.*
