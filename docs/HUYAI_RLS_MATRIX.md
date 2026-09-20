# HUYAI ROW-LEVEL SECURITY (RLS) MATRIX & SECURITY BASELINE
## RECONCILED SPECIFICATION (PHASE 06G — HAIP V1.2)

**Trạng thái:** TÀI LIỆU PHÂN TÁCH BẢO MẬT CHÍNH THỨC (HAIP V1.2)  
**Dự án:** Supabase `HuyAI` (`bdeluacbzbdflxubhpha`, Singapore)  
**Quy tắc bất biến:** Phân biệt rõ ràng giữa Schema Cũ (`LEGACY_HUYAI`: 19 bảng) và Schema Mới (`AI_CENTER_V1_2`: 15 bảng).  
**DDL trên Production:** **ZERO (CHƯA THỰC THI)**  

---

# PHẦN A: LEGACY_HUYAI_BASELINE (19 BẢNG HIỆN HỮU)

Toàn bộ **19 bảng hiện hữu** và **239 dòng dữ liệu sản xuất** được giữ nguyên trạng 100%:

| STT | Bảng Hiện Hữu | RLS Status | Hiện Trạng Chính Sách | Hành Động Trong Phase 06G |
| :---: | :--- | :---: | :--- | :--- |
| 1 | `contacts` | Enabled | Có policy | **TOUCH ZERO** |
| 2 | `videos` | Enabled | Có policy | **TOUCH ZERO** |
| 3 | `resources` | Enabled | Có policy | **TOUCH ZERO** |
| 4 | `resource_views` | Enabled | Có policy | **TOUCH ZERO** |
| 5 | `premium_contents` | Enabled | Có policy | **TOUCH ZERO** |
| 6 | `item_reviews` | Enabled | Có policy | **TOUCH ZERO** |
| 7 | `audit_logs` | Enabled | Có policy | **TOUCH ZERO (ZERO DDL)** — Tái sử dụng cột `details JSONB` hiện hữu. |
| 8 | `user_activity_metrics` | Enabled | Có policy | **TOUCH ZERO** |
| 9 | `student_points_balance` | Enabled | Có policy | **TOUCH ZERO** |
| 10 | `daily_tasks` | Enabled | Có policy | **TOUCH ZERO** |
| 11 | `task_completions` | Enabled | Có policy | **TOUCH ZERO** |
| 12 | `cms_folders` | Enabled | Có policy | **TOUCH ZERO** |
| 13 | `orders` | Enabled | Có policy | **TOUCH ZERO** — Giữ nguyên cho thanh toán khóa học. |
| 14 | `cms_settings` | Enabled | Không có policy (Cảnh báo cũ) | **TOUCH ZERO** (Không tự ý sửa) |
| 15 | `knowledge_chunks` | Enabled | Có multiple permissive policies | **TOUCH ZERO** (Tái sử dụng cho RAG) |
| 16 | `user_video_progress` | Enabled | Không có policy (Cảnh báo cũ) | **TOUCH ZERO** (Không tự ý sửa) |
| 17 | `user_document_progress` | Enabled | Không có policy (Cảnh báo cũ) | **TOUCH ZERO** (Không tự ý sửa) |
| 18 | `leads` | Enabled | Không có policy (Cảnh báo cũ) | **TOUCH ZERO** (Không tự ý sửa) |
| 19 | `site_content` | Enabled | Có policy | **TOUCH ZERO** |

> [!NOTE]
> Các cảnh báo bảo mật cũ của `LEGACY_HUYAI` (ví dụ 4 bảng có RLS nhưng thiếu policy) được cách ly độc lập. Chúng không được gom chung vào migration của AI Center để tránh tạo ra sự phụ thuộc chéo hoặc thay đổi hành vi ngoài ý muốn.

---

# PHẦN B: AI_CENTER_V1_2_SECURITY_MATRIX (15 BẢNG MỚI)

Tất cả **15 bảng mới** đều được kích hoạt Row-Level Security (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY;`).

Quyền hạn truy cập được phân chia thành hai loại nghiêm ngặt:
1. **OWNER-READ:** Người dùng đã xác thực chỉ có thể đọc dữ liệu thuộc về chính họ (`owner_user_id = auth.uid()`).
2. **SERVER-ONLY:** Ẩn hoàn toàn khỏi mọi client web/trình duyệt. Chỉ `service_role` (Backend Next.js API và Worker Dispatcher) mới có quyền truy cập.

| STT | Tên Bảng Mới | RLS Phân Loại | Anon (Khách) | Authenticated (Người Dùng) | Service Role (Backend / Worker) |
| :---: | :--- | :---: | :---: | :---: | :---: |
| 1 | **`ai_tasks`** | **OWNER-READ** | ❌ Chặn | **SELECT / INSERT**: Chỉ tác vụ của chính mình (`owner_user_id = auth.uid()`). | **ALL** (Full Access) |
| 2 | **`ai_task_steps`** | **SERVER-ONLY** | ❌ Chặn | ❌ **Chặn 100% (DENIED)**: Toàn bộ tin nhắn liên tác tử, reasoning trace, prompt context nội bộ được bảo vệ tuyệt đối. | **ALL** (Full Access) |
| 3 | **`ai_outputs`** | **OWNER-READ** | ❌ Chặn | **SELECT**: Chỉ xem kết quả thuộc tác vụ của chính mình (thông qua `EXISTS (SELECT 1 FROM ai_tasks WHERE task_id = id AND owner_user_id = auth.uid())`). | **ALL** (Full Access) |
| 4 | **`nodes`** | **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |
| 5 | **`node_heartbeats`** | **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |
| 6 | **`ai_providers`** | **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |
| 7 | **`ai_models`** | **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |
| 8 | **`tools`** | **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |
| 9 | **`tool_versions`** | **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |
| 10 | **`tool_capabilities`**| **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |
| 11 | **`agents`** | **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |
| 12 | **`agent_versions`** | **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |
| 13 | **`github_projects`** | **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |
| 14 | **`github_reviews`** | **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |
| 15 | **`github_versions`** | **SERVER-ONLY** | ❌ Chặn | ❌ Chặn | **ALL** (Full Access) |

---

# PHẦN C: BẢO VỆ RPC GATEWAY & PGMQ QUEUE

### 1. Phân Quyền RPC Chức Năng
Tất cả các hàm Gateway điều phối công việc đều được thiết lập:
- `SECURITY DEFINER`
- `SET search_path = public, pgmq, pg_temp;`
- Thu hồi toàn bộ quyền thực thi từ `PUBLIC`, `anon`, `authenticated`.
- Chỉ cấp quyền `EXECUTE` duy nhất cho `service_role`.

```sql
REVOKE ALL ON FUNCTION public.haip_enqueue_job(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.haip_enqueue_job(UUID, TEXT, JSONB) TO service_role;

REVOKE ALL ON FUNCTION public.haip_read_jobs(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.haip_read_jobs(TEXT, INTEGER, INTEGER) TO service_role;

REVOKE ALL ON FUNCTION public.haip_archive_job(BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.haip_archive_job(BIGINT) TO service_role;

REVOKE ALL ON FUNCTION public.claim_ai_task(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_task(TEXT) TO service_role;
```

### 2. Không Phơi Bày `pgmq_public`
- Tuyệt đối không cài đặt hoặc cấp quyền schema `pgmq_public` cho client.
- Client chỉ tương tác thông qua API routes Next.js (`/api/ai/tasks`) với quyền `service_role` sau khi đã xác thực người dùng.
