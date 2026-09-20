# HUYAI MIGRATION PLAN — HUY TECHNOLOGY AI CENTER V1.1
## PRE-APPLICATION VERIFICATION PLAN (PHASE 06C)

**Trạng thái:** KẾ HOẠCH MIGRATION CUỐI CÙNG (CHỜ PHÊ DUYỆT CỦA CON NGƯỜI TRƯỚC KHI THI HÀNH)  
**Mục tiêu:** Dự án Supabase `HuyAI` (`bdeluacbzbdflxubhpha`, Singapore)  
**Nguyên tắc:** KHÔNG DROP — KHÔNG TRUNCATE — KHÔNG RESET — KHÔNG DESTRUCTIVE ALTER.  
**DDL ÁP DỤNG TRÊN PRODUCTION:** **ZERO**

---

## 1. Trình Tự Thực Thi 5 Migration Tinh Giản

| STT | Tệp Migration | Module Logic | Nội Dung Cốt Lõi | Dữ Liệu Seed Đi Kèm |
| :---: | :--- | :--- | :--- | :--- |
| **01** | `20260920000001_ai_operations.sql` | **AI Operations** | Tạo `ai_tasks`, `ai_task_steps`, `ai_outputs`. Kích hoạt RLS, tạo chỉ mục tối ưu polling. | **KHÔNG CÓ** (Trống) |
| **02** | `20260920000002_infrastructure.sql` | **Infrastructure** | Tạo `nodes`, `node_heartbeats`. Thiết lập RLS. | **DUY NHẤT:** `huy-ai-node-01` (Dell M4800 vật lý) |
| **03** | `20260920000003_ai_registry.sql` | **AI Registry** | Tạo `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`. RLS Enabled. | **KHÔNG CÓ** (Bảng trống, không seed tools/models theo Phase 06C) |
| **04** | `20260920000004_github_radar.sql` | **GitHub Radar** | Tạo `github_projects`, `github_reviews`, `github_versions`. RLS Enabled. | **KHÔNG CÓ** (Trống) |
| **05** | `20260920000005_queue_and_governance.sql` | **Queue & Governance** | 1. Bật extension `pgmq` (v1.5.1).<br>2. Tạo queue `ai-jobs` qua `pgmq.create('ai-jobs')`.<br>3. Tạo hàm atomic `claim_ai_task()`.<br>4. Mở rộng an toàn bảng hiện hữu `audit_logs` bằng `ADD COLUMN IF NOT EXISTS`. | **KHÔNG CÓ** (Chỉ hàm & cấu hình hàng đợi) |

---

## 2. Tiền Kiểm Tra Trước Khi Chạy (Pre-Migration Checklist)

1. **Sao lưu siêu dữ liệu:** Xuất backup DDL hiện tại của 19 bảng sản xuất.
2. **Kiểm tra phiên bản pgmq:** Xác nhận `pgmq` v1.5.1 sẵn sàng trong `pg_available_extensions`.
3. **Quyền hạn executing:** Sử dụng `postgres` hoặc `service_role` để thiết lập extension và RLS.
4. **Bảo tồn dữ liệu:** Xác nhận lệnh `ALTER TABLE public.audit_logs` tuyệt đối không làm mất dòng log lịch sử nào.

---

## 3. Hậu Kiểm Tra Sau Triển Khai (Post-Migration Checklist)

1. **Xác nhận số lượng bảng:** Tổng số bảng trong schema `public` tăng từ **19 bảng** lên **31 bảng** (19 bảng cũ + 12 bảng mới).
2. **Xác nhận trạng thái 19 bảng cũ:** Số lượng dòng (row count) của toàn bộ 19 bảng cũ phải giữ nguyên 100%.
3. **Xác nhận PGMQ Queue:** Truy vấn `SELECT * FROM pgmq.q_ai_jobs` hoặc `SELECT * FROM pgmq.list_queues()` trả về queue `ai-jobs`.
4. **Xác nhận Worker Node:** Bảng `public.nodes` chứa 1 dòng định danh `'huy-ai-node-01'`.
5. **Xác nhận Registry Trống:** `ai_providers`, `ai_models`, `tools`, `agents` có row count = 0 (chờ nạp qua catalog migration riêng).

---

## 4. Ghi Chú Hoàn Tác An Toàn (Non-Destructive Rollback Notes)

Nếu cần hủy bỏ các thành phần AI Center đã tạo:
- **Module 05 (Queue & Audit Logs):**
  ```sql
  DO $$ BEGIN PERFORM pgmq.drop_queue('ai-jobs'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
  DROP FUNCTION IF EXISTS public.claim_ai_task(text);
  DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
  DROP POLICY IF EXISTS "Service role full on audit_logs" ON public.audit_logs;
  -- TUYỆT ĐỐI KHÔNG DROP TABLE audit_logs; giữ nguyên các cột mở rộng để không ảnh hưởng dữ liệu cũ.
  ```
- **Module 04 (GitHub Radar):**
  ```sql
  DROP TABLE IF EXISTS public.github_versions CASCADE;
  DROP TABLE IF EXISTS public.github_reviews CASCADE;
  DROP TABLE IF EXISTS public.github_projects CASCADE;
  ```
- **Module 03 (AI Registry):**
  ```sql
  DROP TABLE IF EXISTS public.agent_versions CASCADE;
  DROP TABLE IF EXISTS public.agents CASCADE;
  DROP TABLE IF EXISTS public.tool_capabilities CASCADE;
  DROP TABLE IF EXISTS public.tool_versions CASCADE;
  DROP TABLE IF EXISTS public.tools CASCADE;
  DROP TABLE IF EXISTS public.ai_models CASCADE;
  DROP TABLE IF EXISTS public.ai_providers CASCADE;
  ```
- **Module 02 (Infrastructure):**
  ```sql
  DROP TABLE IF EXISTS public.node_heartbeats CASCADE;
  DROP TABLE IF EXISTS public.nodes CASCADE;
  ```
- **Module 01 (AI Operations):**
  ```sql
  DROP TABLE IF EXISTS public.ai_outputs CASCADE;
  DROP TABLE IF EXISTS public.ai_task_steps CASCADE;
  DROP TABLE IF EXISTS public.ai_tasks CASCADE;
  ```

*Toàn bộ 19 bảng sản xuất gốc luôn được bảo toàn 100% trong mọi tình huống rollback.*
