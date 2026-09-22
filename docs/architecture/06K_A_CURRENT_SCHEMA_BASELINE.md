# HIỆN TRẠNG BASELINE CƠ SỞ DỮ LIỆU SẢN XUẤT
## PHASE 06K-A — PRODUCTION SCHEMA BASELINE VERIFICATION

**Dự án:** HUY AI AGENCY GROUP V2.0  
**Hệ thống:** HUY AI CENTER / HAIP CONTROL PLANE  
**Cơ sở dữ liệu Supabase Sản xuất:** `HuyAI` (Project Ref: `bdeluacbzbdflxubhpha`)  
**Thời điểm đối soát Read-Only:** 2026-09-22T22:05:53+07:00  
**Trạng thái đối soát:** **VERIFIED (100% UNTOUCHED / ZERO MUTATION)**  

---

## 1. TỔNG QUAN DANH MỤC 34 BẢNG PUBLIC HIỆN HỮU

Cơ sở dữ liệu sản xuất hiện hữu bao gồm chính xác **34 bảng public**, được phân chia rõ ràng giữa 19 bảng ứng dụng kế thừa (Legacy Application) và 15 bảng AI Control Plane (được thiết lập chuẩn từ Phase 06H):

### 1.1. Nhóm 19 Bảng Kế thừa (Legacy Application Tables - 239 hàng dữ liệu)
1. `contacts` (0 hàng)
2. `videos` (1 hàng)
3. `resources` (1 hàng)
4. `resource_views` (31 hàng)
5. `premium_contents` (0 hàng)
6. `item_reviews` (0 hàng)
7. `audit_logs` (0 hàng)
8. `user_activity_metrics` (20 hàng)
9. `student_points_balance` (3 hàng)
10. `daily_tasks` (0 hàng)
11. `task_completions` (0 hàng)
12. `cms_folders` (2 hàng)
13. `orders` (177 hàng)
14. `cms_settings` (3 hàng)
15. `knowledge_chunks` (0 hàng)
16. `user_video_progress` (0 hàng)
17. `user_document_progress` (0 hàng)
18. `leads` (0 hàng)
19. `site_content` (1 hàng)

> **Nguyên tắc an toàn:** Tuyệt đối không can thiệp, không thêm khóa ngoại, không thay đổi cấu trúc của 19 bảng kế thừa trên trong suốt quá trình phát triển Phase 06K.

### 1.2. Nhóm 15 Bảng AI Center Control Plane (HAIP 1.0)
1. `ai_tasks`: Bảng quản lý vòng đời tác vụ AI đa bước (Hiện có 1 hàng từ bài test kiểm định).
2. `ai_task_steps`: Bảng ghi nhật ký bước thực thi và thông điệp phong bì HAIP (0 hàng).
3. `ai_outputs`: Bảng lưu trữ kết quả và tạo phẩm AI đầu ra (0 hàng).
4. `nodes`: Bảng đăng ký node xử lý vật lý (Hiện có 1 hàng: `huy-ai-node-01` - Dell Precision M4800, trạng thái `offline`).
5. `node_heartbeats`: Bảng lưu nhịp tim kiểm tra liveness của node (0 hàng).
6. `ai_providers`: Bảng danh mục nhà cung cấp mô hình AI (0 hàng).
7. `ai_models`: Bảng danh mục mô hình AI (0 hàng).
8. `tools`: Bảng định nghĩa công cụ tác tử (0 hàng).
9. `tool_versions`: Bảng phiên bản công cụ (0 hàng).
10. `tool_capabilities`: Bảng ánh xạ năng lực công cụ (0 hàng).
11. `agents`: Bảng đăng ký tác tử logic (0 hàng).
12. `agent_versions`: Bảng phiên bản tác tử bất biến (0 hàng).
13. `github_projects`: Bảng dự án radar GitHub (0 hàng).
14. `github_reviews`: Bảng phân tích mã nguồn GitHub (0 hàng).
15. `github_versions`: Bảng theo dõi phiên bản GitHub (0 hàng).

---

## 2. LỊCH SỬ MIGRATION ĐÃ ÁP DỤNG TRÊN PRODUCTION

Hệ thống đã trải qua **7 bản migration chính thức** tại Phase 06H:
1. `20260921005127_remote_schema.sql`: Khởi tạo baseline remote schema ban đầu.
2. `20260921010001_ai_operations.sql`: Thiết lập bảng vận hành AI (`ai_tasks`, `ai_task_steps`, `ai_outputs`).
3. `20260921010002_infrastructure.sql`: Thiết lập hạ tầng node vật lý (`nodes`, `node_heartbeats`).
4. `20260921010003_ai_registry.sql`: Thiết lập danh mục mô hình, công cụ và tác tử (`ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`).
5. `20260921010004_github_radar.sql`: Thiết lập hệ thống phân tích và giám sát mã nguồn GitHub.
6. `20260921010005_queue_and_governance.sql`: Khởi tạo hàng đợi PGMQ `ai-jobs` và các hàm RPC điều phối lõi (`haip_enqueue_job`, `haip_read_jobs`, `haip_archive_job`, `claim_ai_task`).
7. `20260921010006_ai_center_security_hardening.sql`: Củng cố bảo mật Row Level Security và phân quyền truy cập.

---

## 3. ĐỐI SOÁT CẤU TRÚC CHI TIẾT CÁC BẢNG LÕI

### 3.1. Bảng `public.agent_versions` (Hiện có: 0 hàng)
Đã xác thực chính xác **13 cột canonical**:
- `id` (uuid, PK)
- `agent_id` (uuid, FK -> agents.id)
- `version` (text)
- `capabilities` (text[])
- `accepted_inputs` (jsonb)
- `output_types` (jsonb)
- `runtime` (jsonb)
- `risk_ceiling` (smallint)
- `max_parallel_tasks` (integer)
- `configuration` (jsonb)
- `metadata` (jsonb)
- `schema_version` (text)
- `created_at` (timestamptz)

> [!IMPORTANT]
> **Xác nhận không tồn tại cột `agent_card`:** Kiểm tra thực tế xác nhận lỗi `column agent_versions.agent_card does not exist`. Bảng hiện tại hoàn toàn chưa có cột `agent_card`. Trong Phase 06K-A, thiết kế sẽ bổ sung cột tường minh `agent_card jsonb` và `agent_card_hash text`, không giấu dữ liệu trong `configuration` hay `metadata`.

### 3.2. Bảng `public.agents` (Hiện có: 0 hàng)
Bao gồm các trường quản trị tác tử:
- `id` (uuid, PK)
- `name` (text, UNIQUE)
- `version` (text)
- `description` (text)
- `capabilities` (text[])
- `risk_ceiling` (smallint)
- `max_parallel_tasks` (integer)
- `enabled` (boolean)
- `health_status` (text)
- `last_seen_at` (timestamptz)
- `active_task_count` (integer)
- `configuration` (jsonb)
- `metadata` (jsonb)
- `created_at` (timestamptz)
- `updated_at` (timestamptz)

### 3.3. Bảng `public.ai_tasks` (Hiện có: 1 hàng)
Đã xác thực đầy đủ **45 cột canonical**:
- `id`, `owner_user_id`, `conversation_id`, `parent_task_id`, `idempotency_key`
- `haip_version`, `source_app`, `intent`, `priority`, `assigned_capability`
- `assigned_agent_id`, `depends_on`, `parallel_group`, `completion_condition`
- `status`, `risk_level`, `risk_context`, `approval_required`, `approval_status`
- `approved_by`, `approved_at`, `approval_note`, `budget_config`, `estimated_cost_usd`
- `actual_cost_usd`, `token_usage`, `runtime_ms`, `constraints`, `input_refs`
- `input`, `expected_outputs`, `output`, `project_context_ref`, `task_memory_ref`
- `retry_count`, `max_retries`, `review_cycle`, `state_version`, `claimed_by_node_id`
- `expires_at`, `claimed_at`, `started_at`, `completed_at`, `created_at`, `updated_at`

### 3.4. Bảng `public.nodes` và `node_heartbeats`
- `public.nodes`: Có đúng 1 node đại diện hạ tầng phần cứng nội bộ:
  - `id`: `'huy-ai-node-01'`
  - `name`: `'Dell Precision M4800 Primary AI Node'`
  - `status`: `'offline'` (Bảo toàn an toàn)
- `public.node_heartbeats`: 0 hàng.

### 3.5. Trạng thái Hàng đợi PGMQ `ai-jobs`
- Hàm RPC `haip_read_jobs`: Trả về 0 thông điệp.
- Hàng đợi `ai-jobs`: Trạng thái trống (ready messages = 0), sẵn sàng cho việc tiếp nhận phong bì tác vụ đa tổ chức.
