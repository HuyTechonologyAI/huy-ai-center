# HUYAI CONTROL CENTER GAP ANALYSIS

**Mục tiêu:** So sánh chi tiết giữa Hiện trạng Cơ sở dữ liệu `HuyAI` (Singapore) với Yêu cầu Kiến trúc AI Center (V1.1), phân loại các hành động: `REUSE EXISTING`, `EXTEND EXISTING`, `CREATE NEW`, `DO NOT CREATE`, `REQUIRES REVIEW`.

---

## 1. Bảng Đối Chiếu Hiện Trạng và Yêu Cầu

| Nhóm Chức Năng | Khái Niệm Yêu Cầu | Bảng / Thành Phần Hiện Hữu Trên `HuyAI` | Phân Loại Xử Lý | Giải Pháp Thực Thi Chi Tiết |
|---|---|---|---|---|
| **Identity** | User Profiles | `auth.users` (Supabase Auth) | **EXTEND EXISTING** | Không tạo bảng `users` trùng lặp. Tạo bảng `public.profiles` liên kết `REFERENCES auth.users(id)` bằng cơ chế `IF NOT EXISTS` và trigger an toàn `handle_new_user()`. |
| **Identity** | Organizations & Members | Chưa có | **CREATE NEW** | Tạo `public.organizations` và `public.organization_members` phục vụ phân quyền trường học / tổ chuyên môn. |
| **Audit Logs** | Audit Logging | `public.audit_logs` (Đã tồn tại trong `edtech-ai-portfolio`: `user_id`, `user_email`, `action_type`, `target_resource`, `details`) | **REUSE & EXTEND EXISTING** | **TUYỆT ĐỐI KHÔNG DROP/RECREATE.** Bổ sung các cột mới dạng `ADD COLUMN IF NOT EXISTS` (`actor_profile_id`, `organization_id`, `action`, `entity_type`, `entity_id`, `metadata`). Đồng bộ hóa event types (ví dụ: `AI_TASK_CREATED`, `NODE_ONLINE`). |
| **Billing / Usage** | Points & Gamification | `public.student_points_balance` (`user_email`, `points`, `redeemed_courses`) | **REUSE EXISTING** | Giữ nguyên phục vụ hệ thống tích điểm học tập của học viên. Không can thiệp. |
| **Billing / Usage** | AI Token Credits | `public.credit_wallets`, `public.credit_transactions` | **CREATE NEW (SCOPED)** | Tạo ví tín dụng tính toán AI chuyên biệt cho tổ chức / giáo viên (đơn vị: AI compute credits). Tách biệt với điểm thưởng học viên (`student_points_balance`). |
| **E-Commerce** | Orders & Invoices | `public.orders`, `public.transactions` | **REUSE EXISTING** | Giữ nguyên quy trình gạch nợ thanh toán VietQR / PayOS qua `memo_code` của `edtech-ai-portfolio`. AI Center tái sử dụng bảng này khi xuất hóa đơn mua credits. |
| **Task Management** | Student Daily Tasks | `public.daily_tasks`, `public.task_completions` | **REUSE EXISTING** | Giữ nguyên cho học tập của học sinh. |
| **AI Operations** | Central AI Tasks | Chưa có bảng tương đương | **CREATE NEW** | Tạo `public.ai_tasks`, `public.ai_task_steps`, `public.ai_outputs` làm trung tâm hàng đợi điều phối AI. |
| **AI Registry** | Models & Providers | Hiện tại code in-memory trong `ai-gateway.ts` | **CREATE NEW** | Chuyển đổi danh mục mô hình từ in-memory sang database: `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`. |
| **Infrastructure** | Node Telemetry | Chưa có | **CREATE NEW** | Tạo `public.nodes` và `public.node_heartbeats` để giám sát máy chủ Dell Precision M4800 (`huy-ai-node-01`). |
| **GitHub Radar** | Repository Analysis | Chưa có | **CREATE NEW** | Tạo `public.github_projects`, `public.github_reviews`, `public.github_versions`. |
| **Knowledge Base** | RAG / Embeddings | `public.knowledge_chunks` (`source_type`, `chunk_content`, `embedding`) | **REUSE & EXTEND EXISTING** | Tái sử dụng bảng `knowledge_chunks` hiện có, bổ sung index pgvector nếu cần. Không tạo bảng vector trùng lặp. |
| **Storage Buckets** | Storage Objects | Chưa có bucket chính thức trên Supabase Storage | **CREATE NEW** | Khởi tạo 5 storage buckets: `ai-outputs`, `user-uploads`, `knowledge`, `tool-assets`, `avatars` với RLS bảo mật. |
| **Queue** | Native Async Queue | Chưa có | **CREATE NEW** | Tạo `public.queue_messages` và hàm `claim_queue_message()` sử dụng `FOR UPDATE SKIP LOCKED` (Zero-Redis Architecture). |

---

## 2. Phân Tích Chống Trùng Lặp Khái Niệm (Duplicate Prevention)

### 2.1. Audit Logs (Hợp nhất 100%)
- **Hiện trạng:** `edtech-ai-portfolio` ghi nhận audit logs vào `audit_logs` với các trường: `user_id`, `user_email`, `user_name`, `action_type`, `target_resource`, `details`, `created_at`.
- **Giải pháp:** Sử dụng chính bảng `audit_logs` này. Migration sẽ bổ sung các cột mở rộng bằng cú pháp an toàn:
  ```sql
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_profile_id UUID;
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID;
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
  ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
  ```
  Tất cả các hành động AI (`AI_TASK_CREATED`, `AI_TASK_COMPLETED`, `NODE_ONLINE`, `NODE_OFFLINE`) sẽ ghi vào `action_type` (hoặc `action`) và `target_resource` (hoặc `entity_type`).

### 2.2. Điểm thưởng học viên (`student_points_balance`) vs Ví AI Credits (`credit_wallets`)
- `student_points_balance`: Gắn liền với `user_email`, tính điểm thưởng khi học sinh làm bài tập, xem video hoặc streak hàng ngày (gamification).
- `credit_wallets`: Gắn liền với `organization_id` hoặc `profile_id`, dùng để tính hạn mức gọi API/LLM (compute quota).
- **Kết luận:** Hai khái niệm có mục đích hoàn toàn khác nhau về mặt nghiệp vụ kế toán và kỹ thuật. Cho phép tồn tại song song, không gộp lẫn lộn để tránh làm vỡ logic thưởng điểm học tập hiện tại.

### 2.3. Đơn hàng (`orders`) & Giao dịch (`transactions`)
- Giữ nguyên cấu trúc hiện tại của `HuyAI`. Khi Control Center mở tính năng mua gói AI Credits, hệ thống sẽ tạo row vào bảng `orders` hiện hữu với `memo_code` chuẩn VietQR, không sinh bảng đơn hàng mới.

---

## 3. Khuyến Nghị & Hành Động Cần Phê Duyệt (Human Approval Required)
1. **Phê duyệt Refactor Migration 04:** Sửa đổi file migration quản trị `20260917000004_radar_infra_governance.sql` để sử dụng `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` cho bảng `audit_logs` thay vì `CREATE TABLE IF NOT EXISTS` giả định bảng trống.
2. **Không di chuyển `smart-teacher-ai`:** Giữ nguyên dự án `kdpouzqjowbuxtfrqsds` độc lập theo đúng chỉ đạo.
