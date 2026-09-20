# HUYAI FINAL SCHEMA PLAN — HUY TECHNOLOGY AI CENTER V1.1

**Trạng thái:** DỰ THẢO KẾ HOẠCH CUỐI CÙNG (CHỜ PHÊ DUYỆT CỦA CON NGƯỜI)  
**Dự án Supabase mục tiêu:** `HuyAI` (Region: Singapore, Project Ref: `bdeluacbzbdflxubhpha`)  
**Mục tiêu:** Mở rộng cơ sở dữ liệu `HuyAI` phục vụ vận hành AI Center V1.1, kết nối 3 website hiện hữu (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) cùng node on-prem Dell Precision M4800 (`huy-ai-node-01`).

---

## 1. Kết Quả Kiểm Toán Đọc (Read-Only Inspection Summary)

Qua kiểm tra trực tiếp trạng thái thực tế của dự án Supabase `HuyAI`, hệ thống ghi nhận:
- **13 bảng nghiệp vụ đang hoạt động trong môi trường sản xuất:**
  1. `resources` (id, title, description, type, link, ispremium, is_premium, folder_id, created_at)
  2. `videos` (id, title, description, youtubeurl, youtube_url, duration, isfeatured, is_featured, folder_id, created_at)
  3. `contacts` (danh bạ liên hệ khách hàng)
  4. `leads` (thông tin khách hàng tiềm năng)
  5. `student_points_balance` (user_email, points, redeemed_courses, last_updated, streak_count, last_checkin_date)
  6. `daily_tasks` (nhiệm vụ học tập hàng ngày)
  7. `task_completions` (lịch sử hoàn thành bài học)
  8. `user_document_progress` (tiến độ đọc tài liệu)
  9. `user_video_progress` (tiến độ xem video bài giảng)
  10. `knowledge_chunks` (vector embeddings tri thức, pgvector `match_knowledge_chunks`)
  11. `item_reviews` (đánh giá khóa học / tài nguyên)
  12. `orders` (id, user_id, user_email, amount, memo_code, status, referred_by, created_at, updated_at)
  13. `audit_logs` (id, user_id, user_email, user_name, action_type, target_resource, details, created_at)
- **Tiện ích mở rộng (Extensions):**
  - `pgvector`: Đã cài đặt và đang phục vụ `knowledge_chunks`.
  - `pgmq` / Supabase Queue: Chưa kích hoạt.
- **Lịch sử migration:** Chưa từng áp dụng migration runner tự động (`supabase_migrations` trống).

---

## 2. Nguyên Tắc Tái Sử Dụng và Chống Trùng Lặp (Reuse & Non-Duplication)

Tuân thủ nghiêm ngặt chỉ thị kiến trúc:
1. **KHÔNG TẠO BẢNG USERS TRÙNG LẶP (`profiles/users`):**
   - Hệ thống Supabase đã tích hợp `auth.users`.
   - `ai_tasks` và các bảng AI liên kết trực tiếp tới `auth.users(id)` qua `user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL` và lưu trữ `user_email TEXT` đồng bộ với định dạng của `orders` và `student_points_balance`.
2. **KHÔNG TRÙNG LẶP HỆ THỐNG ĐIỂM / TÍN DỤNG (`credits/points`):**
   - Giữ nguyên `student_points_balance` chuyên trách tính điểm thưởng học tập, chuỗi ngày streak và đổi khóa học cho học sinh.
   - Quota và định mức tính toán AI được quản lý độc lập thông qua trường token metrics trong `ai_tasks` và `ai_outputs`, không tạo ví trùng lặp gây xung đột hạch toán điểm học viên.
3. **TÁI SỬ DỤNG VÀ MỞ RỘNG BẢNG AUDIT LOGS (`audit_logs`):**
   - Tuyệt đối không tạo `ai_audit_logs`.
   - Sử dụng lệnh an toàn `ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS ...` để bổ sung các trường: `actor_profile_id`, `organization_id`, `action`, `entity_type`, `entity_id`, `metadata`.
4. **TÁI SỬ DỤNG BẢNG ĐƠN HÀNG (`orders`):**
   - Khi Control Center phát sinh thanh toán nạp hạn mức AI, hệ thống sẽ sử dụng bảng `orders` hiện hữu với mã `memo_code` chuẩn VietQR.
5. **TÁI SỬ DỤNG BẢNG TRI THỨC (`knowledge_chunks`):**
   - RAG pipeline tái sử dụng `knowledge_chunks` và hàm RPC `match_knowledge_chunks` hiện có, không tạo thêm bảng vector mới.

---

## 3. Các Module Logic Mới Cần Triển Khai (Missing Modules)

### Module 1: AI Operations (Điều phối Tác vụ AI)
- `public.ai_tasks`:
  - `id` UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
  - `source_app` TEXT NOT NULL CHECK (`source_app` IN ('education', 'tax', 'control_center', 'external_api'))
  - `task_type` TEXT NOT NULL CHECK (`task_type` IN ('lesson_plan', 'presentation_slides', 'quiz_generator', 'tax_report', 'rag_query', 'custom_workflow'))
  - `priority` TEXT NOT NULL DEFAULT 'normal' CHECK (`priority` IN ('low', 'normal', 'high', 'urgent'))
  - `status` TEXT NOT NULL DEFAULT 'queued' CHECK (`status` IN ('queued', 'claimed', 'running', 'completed', 'failed', 'cancelled', 'timeout'))
  - `payload` JSONB NOT NULL DEFAULT '{}'::jsonb
  - `input` JSONB DEFAULT '{}'::jsonb
  - `result` JSONB
  - `output` JSONB
  - `user_id` UUID REFERENCES `auth.users(id)` ON DELETE SET NULL
  - `user_email` TEXT
  - `organization_id` UUID
  - `claimed_by_node_id` TEXT
  - `claimed_at` TIMESTAMPTZ
  - `started_at` TIMESTAMPTZ
  - `completed_at` TIMESTAMPTZ
  - `timeout_seconds` INTEGER NOT NULL DEFAULT 300
  - `retry_count` INTEGER NOT NULL DEFAULT 0
  - `max_retries` INTEGER NOT NULL DEFAULT 3
  - `error` TEXT
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT `timezone('utc'::text, now())`
  - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT `timezone('utc'::text, now())`
- `public.ai_task_steps`:
  - Quản lý từng bước thực thi trong pipeline phức tạp (ví dụ: tạo dàn ý -> viết nội dung -> sinh trắc nghiệm).
- `public.ai_outputs`:
  - Lưu trữ kết quả đầu ra có cấu trúc, số token tiêu thụ (`tokens_prompt`, `tokens_completion`, `tokens_total`), độ trễ (`latency_ms`), mô hình thực thi.

### Module 2: Infrastructure (Giám sát Node On-Premises Dell M4800)
- `public.nodes`:
  - `id` TEXT PRIMARY KEY (ví dụ: `'huy-ai-node-01'`)
  - `name` TEXT NOT NULL
  - `hostname` TEXT NOT NULL
  - `ip_address` TEXT
  - `status` TEXT NOT NULL DEFAULT 'offline' CHECK (`status` IN ('online', 'offline', 'busy', 'draining', 'maintenance', 'error'))
  - `capabilities` TEXT[] NOT NULL DEFAULT '{}'
  - `specs` JSONB DEFAULT '{}'::jsonb (RAM: 32GB, Storage: 1TB, CPU cores)
  - `max_concurrency` INTEGER NOT NULL DEFAULT 2
  - `current_load` INTEGER NOT NULL DEFAULT 0
  - `last_heartbeat_at` TIMESTAMPTZ
  - `created_at` TIMESTAMPTZ NOT NULL DEFAULT `timezone('utc'::text, now())`
  - `updated_at` TIMESTAMPTZ NOT NULL DEFAULT `timezone('utc'::text, now())`
- `public.node_heartbeats`:
  - Telemetry chu kỳ 10 giây ghi nhận CPU %, RAM %, Disk %, Queue depth của Dell Precision M4800.

### Module 3: AI Registry (Danh mục Nhà cung cấp, Mô hình & Công cụ)
- `public.ai_providers`: Danh mục nhà cung cấp (`gemini`, `ollama`, `groq`, `langflow`, `heuristic_fallback`).
- `public.ai_models`: Danh mục mô hình (`gemini-2.0-flash`, `qwen2.5:7b`, `llama-3.3-70b-versatile`, `vanhoalong-heuristic-v1`).
- `public.tools`: 14 công cụ AI mã nguồn mở đã kiểm toán từ `ai-tools-registry.ts` (`presenton`, `pptagent`, `slidev`, `marp`, `comfyui`, v.v.).
- `public.tool_versions` & `public.tool_capabilities`.
- `public.agents` & `public.agent_versions`.

### Module 4: GitHub Radar (Rà soát & Đánh giá Mã nguồn Mở)
- `public.github_projects`: Kho lưu trữ AI được radar theo dõi.
- `public.github_reviews`: Đánh giá bảo mật, kiến trúc, rủi ro giấy phép.
- `public.github_versions`: Theo dõi các bản release mới nhất.

### Module 5: Queue (Hàng đợi Nhiệm vụ Không Phụ thuộc Redis)
- Kiểm tra kích hoạt `pgmq` extension nếu môi trường Supabase hỗ trợ.
- Chuẩn bị queue `ai-jobs`.
- Bảng fallback dự phòng `public.queue_messages` với hàm claim nguyên tử `claim_queue_message()` và `claim_ai_task()` sử dụng cơ chế PostgreSQL `FOR UPDATE SKIP LOCKED`.

---

## 4. Kiểm Soát Chi Phí & Hạ Tầng (Cost Guard Verification)
- **Redis:** 0% (Hàng đợi sử dụng PostgreSQL native queue / pgmq).
- **Supabase mới:** 0% (Mở rộng trực tiếp dự án HuyAI Singapore).
- **Database mới:** 0% (Không tạo VPS hay RDS mới).
- **LiteLLM / OpenHands:** Hoãn lại trong V1, không cài đặt container nặng.
- **Tổng chi phí phát sinh hàng tháng:** **$0.00 USD**.
