# HUYAI MIGRATION PLAN — HUY TECHNOLOGY AI CENTER V1.2
## RECONCILED PRE-APPLICATION PLAN (PHASE 06G)

**Trạng thái:** KẾ HOẠCH MIGRATION CUỐI CÙNG (CHỜ PHÊ DUYỆT CỦA CON NGƯỜI TRƯỚC KHI THI HÀNH)  
**Mục tiêu:** Dự án Supabase `HuyAI` (`bdeluacbzbdflxubhpha`, Singapore)  
**Kiến trúc:** HAIP Architecture V1.2  
**Hiện trạng:** 19 BẢNG SẢN XUẤT HIỆN HỮU (239 ROWS BẢO TOÀN)  
**Số lượng bảng mới tạo:** CHÍNH XÁC 15 BẢNG (Tổng sau migration: 34 bảng)  
**Nguyên tắc:** KHÔNG DROP — KHÔNG TRUNCATE — KHÔNG RESET — KHÔNG DESTRUCTIVE ALTER.  
**DDL ÁP DỤNG TRÊN PRODUCTION:** **ZERO (CHƯA THỰC THI)**  

---

## 1. Trình Tự Thực Thi 5 Tệp Migration Tinh Giản

| STT | Tệp Migration | Module Logic | Số Bảng Mới | Nội Dung Cốt Lõi V1.2 | Dữ Liệu Seed Đi Kèm |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **01** | `20260920000001_ai_operations.sql` | **AI Operations** | **3** (`ai_tasks`, `ai_task_steps`, `ai_outputs`) | 1. Tạo `ai_tasks` hỗ trợ đồ thị DAG (`depends_on UUID[]`), 16 trạng thái, `risk_level 0-4`, `approval_status`, `state_version`.<br>2. Trigger kiểm tra chuyển trạng thái bất biến `check_ai_task_status_transition()`.<br>3. Tạo `ai_task_steps` hỗ trợ 12 loại thông điệp HAIP/1.0, `message_id UNIQUE`, `envelope JSONB`.<br>4. Tạo `ai_outputs` lưu trữ tham chiếu artifact, checksum, versioning.<br>5. Thiết lập RLS: Owner-Read cho `ai_tasks` & `ai_outputs`; Server-Only cho `ai_task_steps`. | **KHÔNG CÓ** (Trống) |
| **02** | `20260920000002_infrastructure.sql` | **Infrastructure** | **2** (`nodes`, `node_heartbeats`) | Tạo danh bạ máy chủ tính toán và nhật ký heartbeat. Thiết lập Server-Only RLS. | **DUY NHẤT:** `huy-ai-node-01` (Dell Precision M4800 vật lý) |
| **03** | `20260920000003_ai_registry.sql` | **AI Registry** | **7** (`ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`) | Tạo danh mục cấu hình nhà cung cấp, mô hình, công cụ và agent. Bổ sung chỉ mục GIN cho `capabilities`, hỗ trợ Agent Card V1. Thiết lập Server-Only RLS. | **KHÔNG CÓ** (Bảng trống, không seed catalog suy đoán) |
| **04** | `20260920000004_github_radar.sql` | **GitHub Radar** | **3** (`github_projects`, `github_reviews`, `github_versions`) | Tạo cấu trúc theo dõi mã nguồn mở. Server-Only RLS (Chỉ `service_role` có quyền). | **KHÔNG CÓ** (Trống) |
| **05** | `20260920000005_queue_and_governance.sql` | **Queue & Governance** | **0** | 1. Bật extension `pgmq` (v1.5.1).<br>2. Tạo Durable Basic Queue `ai-jobs` qua `pgmq.create('ai-jobs')`.<br>3. Tạo RPC Gateway bảo mật: `haip_enqueue_job()`, `haip_read_jobs()`, `haip_archive_job()`.<br>4. Tạo hàm atomic fallback `claim_ai_task()`.<br>5. Cấp quyền thực thi duy nhất cho `service_role`.<br>6. **ZERO DDL** đối với `public.audit_logs`. | **KHÔNG CÓ** (Chỉ hàm & cấu hình hàng đợi) |

---

## 2. Tiền Kiểm Tra Trước Khi Chạy (Pre-Migration Checklist)

1. **Sao lưu siêu dữ liệu:** Đã ghi nhận bản snapshot 19 bảng hiện hữu với 239 rows (`docs/HUYAI_PRODUCTION_PREAPPLY_SNAPSHOT.md`).
2. **Kiểm tra phiên bản pgmq:** Xác nhận `pgmq` v1.5.1 sẵn sàng trong `pg_available_extensions`.
3. **Quyền hạn executing:** Sử dụng `postgres` hoặc `service_role` để thiết lập extension và RLS.
4. **Bảo tồn dữ liệu:** Tuyệt đối không chạm vào 19 bảng hiện hữu (`contacts`, `videos`, `resources`, `orders`...).

---

## 3. Hậu Kiểm Tra Sau Triển Khai (Post-Migration Checklist)

1. **Xác nhận số lượng bảng:** Tổng số bảng trong schema `public` tăng chính xác từ **19 bảng** lên **34 bảng** (19 bảng cũ + 15 bảng mới).
2. **Xác nhận trạng thái 19 bảng cũ:** Số lượng dòng (row count) của toàn bộ 19 bảng cũ giữ nguyên 100% (239 rows).
3. **Xác nhận PGMQ Queue:** Queue `ai-jobs` được khởi tạo dạng Durable Basic Queue.
4. **Xác nhận Worker Node:** Bảng `public.nodes` chứa đúng 1 dòng định danh `'huy-ai-node-01'`.
5. **Xác nhận Registry Trống:** `ai_providers`, `ai_models`, `tools`, `agents` có row count = 0.
6. **Xác nhận RLS Server-Only:** Các bảng `ai_task_steps`, `nodes`, `node_heartbeats`, `agents`, `tools`, `github_*` không có policy cho `anon` hoặc `authenticated`.

---

## 4. Ghi Chú Hoàn Tác An Toàn (Non-Destructive Rollback Plan)

Nếu có lệnh hủy bỏ sau khi triển khai, chạy tuần tự:
```sql
-- 1. Hủy Queue và RPCs
DO $$ BEGIN PERFORM pgmq.drop_queue('ai-jobs'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP FUNCTION IF EXISTS public.haip_enqueue_job(UUID, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.haip_read_jobs(TEXT, INTEGER, INTEGER);
DROP FUNCTION IF EXISTS public.haip_archive_job(BIGINT);
DROP FUNCTION IF EXISTS public.claim_ai_task(TEXT);

-- 2. Hủy 3 bảng GitHub Radar
DROP TABLE IF EXISTS public.github_versions CASCADE;
DROP TABLE IF EXISTS public.github_reviews CASCADE;
DROP TABLE IF EXISTS public.github_projects CASCADE;

-- 3. Hủy 7 bảng AI Registry
DROP TABLE IF EXISTS public.agent_versions CASCADE;
DROP TABLE IF EXISTS public.agents CASCADE;
DROP TABLE IF EXISTS public.tool_capabilities CASCADE;
DROP TABLE IF EXISTS public.tool_versions CASCADE;
DROP TABLE IF EXISTS public.tools CASCADE;
DROP TABLE IF EXISTS public.ai_models CASCADE;
DROP TABLE IF EXISTS public.ai_providers CASCADE;

-- 4. Hủy 2 bảng Infrastructure
DROP TABLE IF EXISTS public.node_heartbeats CASCADE;
DROP TABLE IF EXISTS public.nodes CASCADE;

-- 5. Hủy Trigger & 3 bảng AI Operations
DROP TRIGGER IF EXISTS trg_ai_tasks_status_transition ON public.ai_tasks;
DROP FUNCTION IF EXISTS public.check_ai_task_status_transition();
DROP TABLE IF EXISTS public.ai_outputs CASCADE;
DROP TABLE IF EXISTS public.ai_task_steps CASCADE;
DROP TABLE IF EXISTS public.ai_tasks CASCADE;
```
*19 bảng sản xuất ban đầu tuyệt đối không bị ảnh hưởng trong bất kỳ trường hợp nào.*
