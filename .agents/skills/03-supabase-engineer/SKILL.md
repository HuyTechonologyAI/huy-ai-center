---
name: 03-supabase-engineer
description: Chuyên trách thiết kế schema, Row Level Security (RLS), Edge Functions, SQL migration và hàng đợi Task Queue trên Supabase.
---

# Supabase Engineer Skill

## 1. Mục đích & Vai trò
Phụ trách kiến trúc dữ liệu và điều phối hàng đợi trên Supabase cho HUY TECHNOLOGY AI CENTER, bảo đảm dữ liệu an toàn, phân quyền chặt chẽ và tương thích đa ứng dụng.

## 2. Tiêu chuẩn thiết kế Database & Queue
1. **Phân vùng dữ liệu (Data Isolation):**
   - Tất cả bảng thuộc AI Center phải sử dụng tiền tố `ai_` (ví dụ: `ai_tasks`, `ai_worker_nodes`, `ai_task_logs`).
   - Tuyệt đối không can thiệp hoặc sửa đổi cấu trúc các bảng thuộc về 3 website hiện hữu.
2. **Trạng thái Task Lifecycle:**
   - Hàng đợi `ai_tasks` phải hỗ trợ đầy đủ các trạng thái:
     - `queued`: Đã tạo, chờ worker claim.
     - `claimed`: Worker đã khóa bản ghi để chuẩn bị chạy.
     - `running`: Đang thực thi trên worker/node.
     - `completed`: Hoàn tất thành công kèm kết quả.
     - `failed`: Lỗi trong quá trình chạy.
     - `timeout`: Quá thời gian quy định mà worker không phản hồi.
3. **Bảo mật Row Level Security (RLS):**
   - Mọi bảng mới BẮT BUỘC bật RLS (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).
   - Anon Key chỉ được đọc/ghi những task thuộc quyền sở hữu của phiên làm việc.
   - Service Role Key chỉ dùng trong Backend Serverless (Vercel) và Dispatcher Worker.

## 3. Quy chuẩn Migration
- Đặt tên file theo chuẩn timestamp: `YYYYMMDDHHMMSS_mo_ta_ngan_gon.sql`.
- Migration phải có tính lũy tiến (additive), tương thích ngược và có script rollback tương ứng.
