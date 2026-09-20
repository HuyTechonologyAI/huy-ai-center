# HUYAI MIGRATION PLAN — HUY TECHNOLOGY AI CENTER V1.1

**Trạng thái:** KẾ HOẠCH MIGRATION AN TOÀN (CHỜ CON NGƯỜI PHÊ DUYỆT TRƯỚC KHI THI HÀNH)  
**Quy tắc:** KHÔNG DROP — KHÔNG TRUNCATE — KHÔNG RESET — KHÔNG DESTRUCTIVE ALTER.

---

## 1. Trình Tự Thực Thi Migration (Execution Sequence)

Các tệp migration được đánh số thứ tự phiên bản theo quy chuẩn Supabase timestamp:

| Thứ Tự | Tệp Migration | Module Logic | Nội Dung Chính | Tác Động Tới Bảng Hiện Hữu |
| :--- | :--- | :--- | :--- | :--- |
| **01** | `20260920000001_ai_operations.sql` | **AI Operations** | Tạo `ai_tasks`, `ai_task_steps`, `ai_outputs`. Thiết lập RLS và chỉ mục thăm dò hàng đợi. | **KHÔNG** (Bảng mới 100%) |
| **02** | `20260920000002_infrastructure.sql` | **Infrastructure** | Tạo `nodes`, `node_heartbeats` quản lý node Dell M4800 (`huy-ai-node-01`). | **KHÔNG** (Bảng mới 100%) |
| **03** | `20260920000003_ai_registry.sql` | **AI Registry** | Tạo `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`. Nạp dữ liệu cấu hình 14 công cụ AI & mô hình Gemini/Ollama. | **KHÔNG** (Bảng mới 100%) |
| **04** | `20260920000004_github_radar.sql` | **GitHub Radar** | Tạo `github_projects`, `github_reviews`, `github_versions`. | **KHÔNG** (Bảng mới 100%) |
| **05** | `20260920000005_queue_and_audit.sql` | **Queue & Governance** | 1. Bật `pgmq` nếu hỗ trợ, tạo queue `ai-jobs`.<br>2. Tạo fallback `queue_messages` + hàm `claim_queue_message()`, `claim_ai_task()`.<br>3. Mở rộng bảng hiện hữu `audit_logs` bằng `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`. | **CÓ — AN TOÀN TUYỆT ĐỐI**: Chỉ bổ sung cột mới, giữ nguyên 100% dữ liệu cũ trong `audit_logs`. |

---

## 2. Các Bước Kiểm Tra Tiền Triển Khai (Pre-Migration Checklist)

Trước khi chạy migration trên production:
1. **Sao lưu siêu dữ liệu & schema hiện tại:**
   - Xuất schema dump hiện tại của Supabase qua Supabase Dashboard hoặc pg_dump (chỉ DDL).
2. **Xác nhận quyền service_role:**
   - Đảm bảo token thực thi có quyền `postgres` hoặc `service_role` để thiết lập RLS và tạo hàm.
3. **Kiểm tra extension pgvector:**
   - Xác nhận `pgvector` đang hoạt động tốt trên `knowledge_chunks`.
4. **Kiểm tra khả năng tương thích pgmq:**
   - Script migration tự động bọc trong khối `DO $$ ... EXCEPTION` để không bao giờ dừng đột ngột nếu extension `pgmq` chưa được Supabase Cloud phân bổ.

---

## 3. Quy Trình Xác Nhận Sau Triển Khai (Post-Migration Verification)

Sau khi áp dụng migration, chạy script tự động để kiểm tra:
1. **Kiểm tra bảng tồn tại:**
   - Xác nhận 12 bảng mới đã hiển thị trong `information_schema.tables`.
2. **Kiểm tra tính toàn vẹn của bảng cũ:**
   - Chạy truy vấn đếm số lượng dòng của `resources`, `videos`, `orders`, `student_points_balance`, `audit_logs`. Số lượng dòng phải không đổi.
3. **Kiểm tra RLS:**
   - Chạy kiểm tra chính sách bảo mật: Đảm bảo anon key không thể đọc hoặc sửa đổi trái phép các task AI của người dùng khác.
4. **Kiểm tra hàm xử lý hàng đợi:**
   - Thực thi thử `SELECT * FROM public.claim_ai_task('test-worker')` trả về kết quả rỗng không lỗi.
5. **Kiểm tra Heartbeat:**
   - Node Dell Precision M4800 gửi gói tin heartbeat đầu tiên vào `node_heartbeats`.

---

## 4. Ghi Chú Hoàn Tác An Toàn (Safe Rollback Notes)

Trong trường hợp cần hoàn tác sau khi đã apply lên Supabase:
- **Nguyên tắc:** KHÔNG ĐƯỢC DROP TOÀN BỘ DATABASE. Chỉ gỡ bỏ các thành phần mới thêm.
- **Rollback cho Module 05 (Audit Logs & Queue):**
  - Giữ nguyên bảng `audit_logs`, chỉ drop các chính sách RLS mới nếu cần:
    ```sql
    DROP POLICY IF EXISTS "Users can view relevant audit logs" ON public.audit_logs;
    DROP POLICY IF EXISTS "Service role full on audit_logs" ON public.audit_logs;
    -- KHÔNG DROP CỘT ĐÃ ADD để tránh khóa bảng sản xuất
    ```
  - Xóa hàng đợi `pgmq`:
    ```sql
    DO $$ BEGIN PERFORM pgmq.drop_queue('ai-jobs'); EXCEPTION WHEN OTHERS THEN NULL; END $$;
    DROP TABLE IF EXISTS public.queue_messages CASCADE;
    DROP FUNCTION IF EXISTS public.claim_queue_message(text, text, integer);
    DROP FUNCTION IF EXISTS public.claim_ai_task(text);
    ```
- **Rollback cho Module 04 (GitHub Radar):**
  ```sql
  DROP TABLE IF EXISTS public.github_versions CASCADE;
  DROP TABLE IF EXISTS public.github_reviews CASCADE;
  DROP TABLE IF EXISTS public.github_projects CASCADE;
  ```
- **Rollback cho Module 03 (AI Registry):**
  ```sql
  DROP TABLE IF EXISTS public.agent_versions CASCADE;
  DROP TABLE IF EXISTS public.agents CASCADE;
  DROP TABLE IF EXISTS public.tool_capabilities CASCADE;
  DROP TABLE IF EXISTS public.tool_versions CASCADE;
  DROP TABLE IF EXISTS public.tools CASCADE;
  DROP TABLE IF EXISTS public.ai_models CASCADE;
  DROP TABLE IF EXISTS public.ai_providers CASCADE;
  ```
- **Rollback cho Module 02 (Infrastructure):**
  ```sql
  DROP TABLE IF EXISTS public.node_heartbeats CASCADE;
  DROP TABLE IF EXISTS public.nodes CASCADE;
  ```
- **Rollback cho Module 01 (AI Operations):**
  ```sql
  DROP TABLE IF EXISTS public.ai_outputs CASCADE;
  DROP TABLE IF EXISTS public.ai_task_steps CASCADE;
  DROP TABLE IF EXISTS public.ai_tasks CASCADE;
  ```

*Toàn bộ dữ liệu của 13 bảng sản xuất ban đầu hoàn toàn được bảo toàn 100% trong mọi tình huống.*
