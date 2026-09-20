# HUYAI ROW-LEVEL SECURITY (RLS) MATRIX & SECURITY BASELINE
## RECONCILED SPECIFICATION (PHASE 06D)

**Trạng thái:** TÀI LIỆU PHÂN TÁCH BẢO MẬT HIỆN TRẠNG & BẢO MẬT MỚI (15 BẢNG MỚI ĐÃ ĐỐI SOÁT)  
**Dự án:** Supabase `HuyAI` (`bdeluacbzbdflxubhpha`, Singapore)  
**Quy tắc:** Phân biệt rõ ràng giữa Schema Cũ (Legacy: 19 bảng) và Schema Mới (AI Center: 15 bảng mới + 1 bảng mở rộng). Không can thiệp chính sách cũ khi chưa có phê duyệt riêng.

---

# PHẦN A: LEGACY_SECURITY_BASELINE (HIỆN TRẠNG 19 BẢNG CŨ)

Kiểm toán thực tế cho thấy cơ sở dữ liệu `HuyAI` hiện hữu đang tồn tại các cảnh báo bảo mật và tối ưu hóa sau:

### 1. Bảng có RLS Bật nhưng CHƯA CÓ Policy nào (RLS Enabled with No Policies)
*Tình trạng:* Khi bật RLS mà không có chính sách (policy), mọi truy vấn từ anonymous và authenticated users đều bị chặn theo mặc định (chỉ service_role có quyền đọc/ghi).
- `public.cms_settings`
- `public.leads`
- `public.user_document_progress`
- `public.user_video_progress`

### 2. Cảnh báo Mutable Search Path trên Stored Procedure
- Hàm `public.match_knowledge_chunks`: Đang thiếu khai báo `SET search_path = public, pg_temp;`.

### 3. Cảnh báo Hiệu Năng & Tối Ưu Hóa (Performance & Permissive Warnings)
- **Foreign keys without covering indexes:** Một số bảng cũ có khóa ngoại trỏ tới tài nguyên nhưng thiếu chỉ mục B-tree tương ứng.
- **Multiple permissive policies on `knowledge_chunks`:** Tồn tại nhiều policy permissive cùng áp dụng cho một hành vi, có thể làm chậm quá trình kiểm tra quyền khi khối lượng vector lớn.
- **RLS Init-Plan optimization:** Một số điều kiện policy cũ thực hiện sub-query lặp lại thay vì dùng hàm đánh dấu STABLE/IMMUTABLE.

> [!WARNING]
> **CHỈ THỊ KIẾN TRÚC VỀ SCHEMA CŨ:**  
> Không tuyên bố toàn bộ HuyAI là "security-clean". Không tự ý trộn lẫn việc sửa các bảng cũ vào các tệp migration của AI Center. Các biện pháp khắc phục cho schema cũ được lập thành phương án riêng biệt tại **PHẦN C** và chỉ thi hành khi có phê duyệt độc lập.

---

# PHẦN B: AI_CENTER_SECURITY_BASELINE (CHÍNH XÁC 15 BẢNG MỚI + 1 BẢNG MỞ RỘNG)

Tất cả **15 bảng mới** của AI Center V1.1 được áp dụng tiêu chuẩn bảo mật tuyệt đối 100%:

| STT | Tên Bảng Mới | RLS Status | Anon (Khách) | Authenticated (Người dùng) | Service Role (Backend/Worker) | Chỉ Mục Khóa Ngoại |
| :---: | :--- | :---: | :--- | :--- | :--- | :--- |
| 1 | **`ai_tasks`** | **ENABLED** | ❌ Chặn | **SELECT / INSERT**: Chỉ tác vụ của chính mình (`user_id = auth.uid()` hoặc `user_email = auth.jwt()->email`). | **ALL** | `idx_ai_tasks_user_id`, `idx_ai_tasks_queue_poll` |
| 2 | **`ai_task_steps`** | **ENABLED** | ❌ Chặn | **SELECT**: Chỉ xem bước của task thuộc quyền mình. | **ALL** | `idx_ai_task_steps_task` |
| 3 | **`ai_outputs`** | **ENABLED** | ❌ Chặn | **SELECT**: Chỉ xem kết quả thuộc task của mình. | **ALL** | `idx_ai_outputs_task` |
| 4 | **`nodes`** | **ENABLED** | ❌ Chặn | **SELECT**: Đọc thông tin node an toàn (online/offline, capabilities). | **ALL** | `idx_nodes_status` |
| 5 | **`node_heartbeats`** | **ENABLED** | ❌ Chặn | **SELECT**: Đọc telemetry giám sát. | **ALL** | `idx_node_heartbeats_node` |
| 6 | **`ai_providers`** | **ENABLED** | **SELECT** (`is_active = true`) | **SELECT** (`is_active = true`) | **ALL** | Khóa chính TEXT |
| 7 | **`ai_models`** | **ENABLED** | **SELECT** (`is_active = true`) | **SELECT** (`is_active = true`) | **ALL** | `idx_ai_models_provider` |
| 8 | **`tools`** | **ENABLED** | **SELECT** (`status != 'deprecated'`) | **SELECT** (`status != 'deprecated'`) | **ALL** | Khóa chính TEXT |
| 9 | **`tool_versions`** | **ENABLED** | **SELECT** (`is_active = true`) | **SELECT** (`is_active = true`) | **ALL** | `uq_tool_version` |
| 10 | **`tool_capabilities`**| **ENABLED** | **SELECT** | **SELECT** | **ALL** | `uq_tool_capability` |
| 11 | **`agents`** | **ENABLED** | **SELECT** (`is_active = true`) | **SELECT** (`is_active = true`) | **ALL** | Khóa ngoại model |
| 12 | **`agent_versions`** | **ENABLED** | **SELECT** | **SELECT** | **ALL** | `uq_agent_version` |
| 13 | **`github_projects`** | **ENABLED** | ❌ Chặn | ❌ **Chặn (Server-Only)** | **ALL (Service-Role Only)** | `idx_github_projects_monitored` |
| 14 | **`github_reviews`** | **ENABLED** | ❌ Chặn | ❌ **Chặn (Server-Only)** | **ALL (Service-Role Only)** | `idx_github_reviews_project` |
| 15 | **`github_versions`** | **ENABLED** | ❌ Chặn | ❌ **Chặn (Server-Only)** | **ALL (Service-Role Only)** | `idx_github_versions_project` |
| — | **`audit_logs`** *(Mở rộng)* | **ENABLED** | ❌ Chặn | **SELECT**: Chỉ xem log của chính mình (`actor_profile_id = auth.uid()` hoặc `user_email`). | **ALL** | `idx_audit_logs_actor`, `idx_audit_logs_action` |

### Nguyên Tắc Thiết Kế Cho GitHub Radar (Server-Only)
- 3 bảng `github_projects`, `github_reviews`, `github_versions` được cấu hình **hoàn toàn Server-Side**:
  - RLS được bật bắt buộc.
  - **Không cấp quyền cho client** (anon và authenticated đều không có policy SELECT/INSERT/UPDATE/DELETE).
  - Chỉ backend scanner và dispatcher chạy với `service_role` mới có quyền đọc và cập nhật dữ liệu.

### Bảo Vệ Stored Procedures AI Center
Mọi hàm trong migration AI Center đều tuân thủ nguyên tắc search_path:
```sql
CREATE OR REPLACE FUNCTION public.claim_ai_task(p_worker_id TEXT)
RETURNS SETOF public.ai_tasks 
SET search_path = public, pg_temp
LANGUAGE plpgsql SECURITY DEFINER AS $$ ... $$;
```

---

# PHẦN C: OPTIONAL_LEGACY_REMEDIATION_PLAN (KẾ HOẠCH KHẮC PHỤC RIÊNG BIỆT)

*Kế hoạch này KHÔNG nằm trong core migration của AI Center. Được chuẩn bị sẵn để trình duyệt độc lập khi cần.*

```sql
-- =============================================================================
-- OPTIONAL SCRIPT: HUYAI LEGACY SCHEMA REMEDIATION
-- ÁP DỤNG KHI VÀ CHỈ KHI CÓ PHÊ DUYỆT RIÊNG
-- =============================================================================

-- 1. Bổ sung policy cho cms_settings (Public đọc cấu hình, Service Role cập nhật)
DROP POLICY IF EXISTS "Public can view active cms_settings" ON public.cms_settings;
CREATE POLICY "Public can view active cms_settings" 
    ON public.cms_settings FOR SELECT TO anon, authenticated USING (true);

-- 2. Bổ sung policy cho leads (Cho phép khách gửi lead, Service Role đọc xử lý)
DROP POLICY IF EXISTS "Public can insert leads" ON public.leads;
CREATE POLICY "Public can insert leads" 
    ON public.leads FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 3. Bổ sung policy cho user_document_progress
DROP POLICY IF EXISTS "Users can manage own document progress" ON public.user_document_progress;
CREATE POLICY "Users can manage own document progress" 
    ON public.user_document_progress FOR ALL TO authenticated 
    USING (user_email = (auth.jwt() ->> 'email'))
    WITH CHECK (user_email = (auth.jwt() ->> 'email'));

-- 4. Bổ sung policy cho user_video_progress
DROP POLICY IF EXISTS "Users can manage own video progress" ON public.user_video_progress;
CREATE POLICY "Users can manage own video progress" 
    ON public.user_video_progress FOR ALL TO authenticated 
    USING (user_email = (auth.jwt() ->> 'email'))
    WITH CHECK (user_email = (auth.jwt() ->> 'email'));

-- 5. Khắc phục search_path trên hàm match_knowledge_chunks
ALTER FUNCTION public.match_knowledge_chunks(vector, double precision, integer) 
    SET search_path = public, pg_temp;
```
