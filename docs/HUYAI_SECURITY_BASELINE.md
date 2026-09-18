# HUYAI SECURITY BASELINE & AUDIT REPORT

**Hệ sinh thái:** HUY TECHNOLOGY AI CENTER  
**Cơ sở dữ liệu trung tâm:** Supabase: `HuyAI` (Singapore)  
**Tiêu chuẩn bảo mật:** Zero-Touch Production & Least Privilege

---

## 1. Kết Quả Kiểm Toán Bảo Mật Hiện Trạng

### 1.1. Hiện trạng RLS (Row Level Security)
- **Tình trạng bảng hiện hữu của `edtech-ai-portfolio`:**
  - Một số bảng như `resources`, `videos`, `daily_tasks` đang mở quyền `SELECT` cho `anon` hoặc `authenticated` để phục vụ hiển thị công khai trên giao diện web.
  - Thao tác ghi (`INSERT`, `UPDATE`, `DELETE`) từ Next.js server route hiện sử dụng `SUPABASE_SERVICE_ROLE_KEY` thông qua `src/lib/supabase-admin.ts` để vượt qua RLS (bypassing RLS).
  - Cookie quản trị viên `admin_session` chỉ được kiểm tra ở tầng ứng dụng Next.js (`verifyAdminAuth`), chưa được xác thực ở tầng database database-level JWT token.
- **Rủi ro nhận diện:**
  - Nếu anon key bị lộ, người dùng trái phép có thể đọc được dữ liệu nếu chính sách `SELECT` trên bảng nhạy cảm (như `contacts`, `leads`, `orders`) bị đặt là `USING (true)`.
  - **Khuyến nghị bảo mật:** Không viết lại tùy tiện các policy hiện hữu của website đang chạy; nhưng trên toàn bộ các bảng mới của AI Center (`ai_tasks`, `ai_outputs`, `nodes`, `queue_messages`), BẮT BUỘC bật RLS và chỉ cấp quyền `ALL` cho `service_role`, phân quyền `SELECT` cho task owner (`profile_id = auth.uid()`).

### 1.2. Vấn đề `search_path` trong Database Functions
- **Tình trạng:**
  - Các hàm SQL kiểu `SECURITY DEFINER` nếu không thiết lập `SET search_path = public, pg_temp` có thể bị tấn công leo thang đặc quyền (Search Path Hijacking).
- **Quy chuẩn bắt buộc cho AI Center Functions:**
  - Mọi hàm mới (ví dụ: `claim_queue_message`, `handle_new_user`) PHẢI được định nghĩa rõ ràng:
    ```sql
    CREATE OR REPLACE FUNCTION public.claim_queue_message(...)
    RETURNS SETOF public.queue_messages
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$ ... $$;
    ```

### 1.3. Khóa Ngoại Thiếu Index (Unindexed Foreign Keys)
- **Rủi ro:** Khi xóa bản ghi cha (hoặc thao tác `CASCADE`), PostgreSQL sẽ quét toàn bộ bảng con (sequential scan), làm chậm nghiêm trọng cơ sở dữ liệu.
- **Rà soát trên Schema mới:**
  - Đảm bảo 100% khóa ngoại được đánh index:
    - `idx_ai_tasks_tenant` trên `(organization_id, profile_id)`
    - `idx_task_steps_task` trên `(task_id, step_number)`
    - `idx_ai_outputs_task` trên `(task_id)`
    - `idx_node_heartbeats_node_time` trên `(node_id, recorded_at DESC)`
    - `idx_organization_members_profile` trên `(profile_id)`

### 1.4. Chính Sách Cho Phép Đa Tầng (Multiple Permissive Policies)
- **Nguyên tắc PostgreSQL:** Nếu có nhiều chính sách `PERMISSIVE`, bản ghi sẽ thỏa mãn nếu BẤT KỲ chính sách nào trả về `TRUE`.
- **Ngăn chặn:** Tránh tạo các policy chồng chéo (redundant policies) trên cùng một bảng để không mở rộng phạm vi truy cập ngoài ý muốn.

### 1.5. Bảo Mật Supabase Storage Buckets
- **Chính sách phân quyền theo bucket:**
  - `user-uploads`: Riêng tư (Private), chỉ task owner và service role được truy cập.
  - `ai-outputs`: Riêng tư (Private), người dùng chỉ tải được tệp gắn với `task_id` của mình.
  - `knowledge`: Giới hạn cho `authenticated` và `service_role`.
  - `tool-assets` & `avatars`: Công khai (Public Read), chỉ ghi bởi tài khoản sở hữu hoặc service role.
- **Giới hạn kích thước tệp (File Size Limit):**
  - Tối đa 50MB cho `user-uploads`, 100MB cho `ai-outputs`, 10MB cho `tool-assets`, 5MB cho `avatars`.

---

## 2. Quy Tắc Ứng Xử An Toàn (Safe Operational Rules)
1. **Không can thiệp RLS hiện tại của các website:** Giữ nguyên vẹn toàn bộ các policy hiện hữu của `edtech-ai-portfolio`, `SmartTeacherSchedule`, và `smarttax-ai`.
2. **Không dùng `SECURITY DEFINER` bừa bãi:** Chỉ sử dụng khi thực sự cần thiết (như hàm atomic claim hàng đợi hoặc trigger user creation), luôn đi kèm `SET search_path = public, pg_temp`.
3. **Bảo mật tuyệt đối `SUPABASE_SERVICE_ROLE_KEY`:** Chỉ cấu hình trong môi trường Vercel Backend và Dispatcher Daemon trên Dell M4800, tuyệt đối không xuất hiện trên Frontend Client.
