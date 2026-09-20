# HUYAI FINAL SCHEMA PLAN — HUY TECHNOLOGY AI CENTER V1.2
## RECONCILED PRE-MIGRATION SPECIFICATION (PHASE 06G)

**Trạng thái:** BẢN THIẾT KẾ CUỐI CÙNG — ĐÃ ĐỐI SOÁT VỚI HAIP V1.2 (CHỜ PHÊ DUYỆT CỦA CON NGƯỜI)  
**Kiến trúc:** V1.2 (Autonomous Multi-Agent Orchestration Platform)  
**Giao thức liên tác tử:** HAIP/1.0 (Huy AI Inter-Agent Protocol)  
**Dự án Supabase mục tiêu:** `HuyAI` (Region: Singapore, Project Ref: `bdeluacbzbdflxubhpha`)  
**DDL ÁP DỤNG TRÊN PRODUCTION:** **ZERO (CHƯA CHẠY BẤT KỲ MIGRATION NÀO)**  
**Số bảng hiện hữu giữ nguyên:** **19 bảng**  
**Số bảng mới thêm vào:** **15 bảng**  
**Tổng số bảng sau khi áp dụng:** **34 bảng**  

---

## 1. Toàn Bộ Kiểm Kê 19 Bảng Hiện Hữu Trên HuyAI (Live Table Inventory: 19)

Kiểm toán trực tiếp môi trường Supabase `HuyAI` Singapore ghi nhận chính xác **19 bảng** trong schema `public` với **239 dòng dữ liệu sản xuất** được bảo toàn nguyên vẹn:

| STT | Tên Bảng Hiện Hữu | Mục Đích Nghiệp Vụ Hiện Tại | Hiện Trạng RLS | Đánh Giá Tái Sử Dụng Cho AI Center |
| :---: | :--- | :--- | :--- | :--- |
| 1 | **`contacts`** | Danh bạ liên hệ khách hàng & đối tác | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 2 | **`videos`** | Danh mục video bài giảng & Youtube | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 3 | **`resources`** | Kho học liệu, giáo trình, tài liệu số | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 4 | **`resource_views`** | Bộ đếm lượt xem tài liệu học tập | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 5 | **`premium_contents`**| Nội dung trả phí khóa học EdTech | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 6 | **`item_reviews`** | Đánh giá sao, nhận xét của học viên | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 7 | **`audit_logs`** | Nhật ký thao tác hệ thống | Enabled | **GIỮ NGUYÊN 100% (ZERO DDL):** Lưu ngữ cảnh bảo mật và user/admin audit. Không thay đổi schema, tận dụng cột `details JSONB` hiện hữu. |
| 8 | **`user_activity_metrics`** | Chỉ số đo lường phiên tương tác web | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 9 | **`student_points_balance`** | Sổ cái tích điểm gamification học viên | Enabled | **TÁI SỬ DỤNG CHO HỌC TẬP:** Không can thiệp, không gộp lẫn lộn với AI Center. |
| 10 | **`daily_tasks`** | Nhiệm vụ học tập hàng ngày của học sinh | Enabled | **GIỮ NGUYÊN:** Phục vụ gamification học sinh. Hoàn toàn độc lập với `ai_tasks`. |
| 11 | **`task_completions`**| Lịch sử hoàn thành nhiệm vụ học tập | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 12 | **`cms_folders`** | Cấu trúc cây thư mục tài liệu CMS | Enabled | **GIỮ NGUYÊN:** AI Center không tạo bảng folder trùng lặp. |
| 13 | **`orders`** | Đơn hàng thanh toán khóa học VietQR ACB | Enabled | **KHÔNG DÙNG CHO AI USAGE:** Giữ nguyên 100% mục đích đơn hàng/thanh toán hiện tại. Tuyệt đối không dùng cho AI token usage hay credit deduction. |
| 14 | **`cms_settings`** | Cấu hình cài đặt giao diện / CMS | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 15 | **`knowledge_chunks`**| Phân mảnh tri thức vector phục vụ RAG (`pgvector` 0.8.0) | Enabled | **TÁI SỬ DỤNG CHO AI RAG:** Tái sử dụng cho retrieval tri thức, không tạo bảng vector mới. |
| 16 | **`user_video_progress`** | Tiến độ thời lượng xem video của học viên | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 17 | **`user_document_progress`** | Tiến độ trang đọc tài liệu của học viên | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 18 | **`leads`** | Khách hàng tiềm năng để lại thông tin | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |
| 19 | **`site_content`** | Nội dung trang landing page động | Enabled | **GIỮ NGUYÊN (TOUCH ZERO)** |

---

## 2. Tiện Ích Mở Rộng & Cơ Chế Hàng Đợi (Extensions & PGMQ Gateway)
- **`pgvector`:** Đã cài đặt phiên bản 0.8.0 và đang phục vụ `public.knowledge_chunks`.
- **`pgmq`:** Khả dụng trong database (phiên bản `1.5.1`), chưa cài đặt. Migration 05 sẽ chạy lệnh `CREATE EXTENSION IF NOT EXISTS pgmq;`.
- **Queue Architecture (Durable Basic Queue `ai-jobs`):**
  - Queue `ai-jobs` được khởi tạo qua `pgmq.create('ai-jobs')` — Durable Basic Queue có WAL logging, an toàn khi restart/crash.
  - Quản trị qua các hàm RPC bảo mật `SECURITY DEFINER` dành riêng cho `service_role`:
    - `public.haip_enqueue_job(p_task_id UUID, p_message_type TEXT, p_envelope JSONB)`
    - `public.haip_read_jobs(p_worker_id TEXT, p_batch_size INT, p_vt INT)`
    - `public.haip_archive_job(p_msg_id BIGINT)`
    - `public.claim_ai_task(p_worker_id TEXT)` (Fallback atomic polling)
  - **Tuyệt đối không cấp quyền hoặc mở `pgmq_public` cho client/trình duyệt**.
- **Redis:** **KHÔNG SỬ DỤNG (0%)**.
- **Bảng Custom Queue:** **KHÔNG TẠO BẢNG MỚI (Loại bỏ hoàn toàn `queue_messages` và DLQ tables)**.

---

## 3. Chính Sách Nghiệp Vụ V1.2: Phân Bổ Chi Phí Tự Thân (Cost Observability Only)
- Bảng `public.orders` **KHÔNG** được sử dụng cho việc trừ credit, tiêu hao token hay hạch toán tài nguyên AI.
- Hệ thống AI Credit / Billing đối với người dùng cuối được **HOÃN LẠI (DEFERRED)**.
- Chi phí được theo dõi nội bộ thông qua các trường quan sát trên `public.ai_tasks`:
  - `budget_config JSONB`
  - `estimated_cost_usd NUMERIC(10, 4)`
  - `actual_cost_usd NUMERIC(10, 4)`
  - `token_usage JSONB`
  - `runtime_ms INTEGER`
- Không tạo bảng `credit_transactions` hay `ai_usage_events`.

---

## 4. Danh Mục Bảng Mới Chính Xác: 15 Bảng (HAIP V1.2 Reconciled)

### 4.1 AI Operations (3 bảng):
1. **`public.ai_tasks`**: Bảng điều phối tác vụ và đồ thị DAG trung tâm.
   - Trạng thái 16 bước: `CREATED`, `PLANNING`, `QUEUED`, `CLAIMED`, `RUNNING`, `REVIEWING`, `CORRECTING`, `FINALIZING`, `AWAITING_APPROVAL`, `APPROVED`, `COMPLETED`, `RETRY_WAIT`, `BLOCKED`, `FAILED`, `CANCELLED`, `EXPIRED`.
   - Ràng buộc chuyển trạng thái bằng trigger deterministic `check_ai_task_status_transition()`.
   - Hỗ trợ DAG: `depends_on UUID[]` có chỉ mục GIN, loại bỏ hoàn toàn nhu cầu bảng `ai_task_dependencies`.
   - Kiểm soát rủi ro: `risk_level 0-4`, `approval_status`, ràng buộc `chk_risk_approval (risk_level < 3 OR approval_required = true)`.
   - Khóa lạc quan: `state_version INTEGER`.
   - RLS: **Owner-Read** (`owner_user_id = auth.uid()`).
2. **`public.ai_task_steps`**: Nhật ký thông điệp HAIP/1.0 và vết thực thi liên tác tử.
   - Lưu trữ 12 loại thông điệp chuẩn (`TASK`, `PLAN`, `CLAIM`, `DELEGATE`, `TOOL_CALL`, `RESULT`, `REVIEW`, `CORRECTION`, `STATE_UPDATE`, `ERROR`, `FINAL_CANDIDATE`, `APPROVAL_REQUEST`).
   - Ràng buộc duy nhất `message_id UUID UNIQUE` và `idempotency_key UNIQUE`.
   - Lưu toàn bộ phong bì HAIP trong `envelope JSONB`. Loại bỏ hoàn toàn nhu cầu bảng `ai_messages`.
   - RLS: **Server-Only** (Chỉ `service_role` có quyền truy cập, hoàn toàn ẩn khỏi client).
3. **`public.ai_outputs`**: Tham chiếu kết quả, artifact đã xác minh và kiểm thử QA.
   - Lưu trữ `artifact_ref`, `artifact_type`, `version`, `checksum_sha256`, `qa_status`.
   - Ràng buộc duy nhất: `UNIQUE (task_id, artifact_ref, version)`.
   - Không lưu trữ tệp nhị phân thô trong database (lưu trên Supabase Storage `ai-artifacts`).
   - RLS: **Owner-Read** (Chỉ chủ sở hữu tác vụ được đọc kết quả).

### 4.2 Infrastructure (2 bảng - Server-Only):
4. **`public.nodes`**: Danh bạ máy chủ xử lý AI (Seed idempotent `huy-ai-node-01` Dell Precision M4800).
5. **`public.node_heartbeats`**: Nhật ký đo lường CPU, RAM, Disk, Queue depth, GPU.

### 4.3 AI Registry (7 bảng — Tạo hoàn toàn trống, Server-Only):
6. **`public.ai_providers`**
7. **`public.ai_models`**
8. **`public.tools`**
9. **`public.tool_versions`**
10. **`public.tool_capabilities`**
11. **`public.agents`**: Bảng tác tử tự trị hỗ trợ định tuyến theo năng lực (`capabilities TEXT[]` có chỉ mục GIN, `risk_ceiling`, `health_status`).
12. **`public.agent_versions`**: Đặc tả Agent Card V1.

### 4.4 GitHub Radar (3 bảng — Server-Only, Service-Role Access Only):
13. **`public.github_projects`**
14. **`public.github_reviews`**
15. **`public.github_versions`**

---

## 5. Tổng Kết Kiến Trúc & Tính Nhất Quán

- **Bảng Cũ:** 19 (Zero DDL, 239 rows bảo toàn nguyên vẹn).
- **Bảng Mới:** Đúng 15 bảng (Tất cả đều có RLS, UUID primary key, chỉ mục B-tree/GIN bao phủ khóa ngoại).
- **Tổng Cộng:** 34 bảng trong schema `public`.
- **Bảng Tránh Tạo:** `ai_messages`, `ai_task_dependencies`, `approvals`, `agent_events`, `queue_messages`, `dead_letter_messages`, `credit_transactions`, `ai_usage_events`.
- **Trạng Thái Triển Khai:** **Chưa áp dụng vào live Supabase (Chờ duyệt)**.
