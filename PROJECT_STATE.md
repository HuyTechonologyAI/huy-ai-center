# PROJECT STATE — HUY TECHNOLOGY AI CENTER

## PROJECT
**HUY TECHNOLOGY AI CENTER** (`huy-ai-center`)  
Trung tâm điều phối AI và quản trị hạ tầng điện toán tập trung cho Hệ sinh thái HUY TECHNOLOGY, kết nối 3 website hiện hữu (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) cùng node AI nội bộ Dell Precision M4800 (`huy-ai-node-01`).

## ARCHITECTURE_VERSION
1.1 (Authoritative Cost-Optimized Patch)

## COST_MODE
COST_OPTIMIZED_V1

## MONTHLY_BUDGET_TARGET
<= 30 USD

## SUPABASE_CONTROL_CENTER
HuyAI (Singapore)

## REDIS
DEFERRED

## LITELLM
DEFERRED

## OPENHANDS
DEFERRED

## LOCAL_NODE
huy-ai-node-01

## CURRENT_PHASE
PHASE 06D — PRE-APPLY BLOCKER FIX COMPLETED (Pending Human Approval to Apply)

## CURRENT_BRANCH
`main`

---

## COST STATE

### Current recurring services:
- Vercel (Hosting 3 Website & Control Center - Plan Dependent)
- Supabase: `HuyAI` Singapore (Free tier with limits - $0.00/month)
- Cloudflare (Free tier with limits - $0.00/month)
- GitHub (Free tier with limits - $0.00/month)

### Known paid services:
- Không có dịch vụ bắt buộc trả phí cố định hàng tháng trong V1.
- Gemini API (Pay-as-you-go, dự báo $0 – $15.00/tháng theo lượng dùng thực tế).

### Free services:
- Dell Precision M4800 (`huy-ai-node-01` On-Premises, chi phí phần cứng tự sở hữu - Đã cài Coolify, Traefik, Cloudflare Tunnel, ops.huycncdsai.io.vn)
- Coolify (Self-hosted trên Dell M4800 - Miễn phí)
- Langflow (Self-hosted trên Dell M4800 - Miễn phí)
- n8n Internal (Self-hosted trên Dell M4800 - Miễn phí)
- Ollama (Self-hosted trên Dell M4800 - Miễn phí)
- Cloudflare Tunnel (Miễn phí)

### Estimated recurring infrastructure cost:
- $0.00 – $15.00 USD / tháng (Chủ yếu từ Gemini API pay-as-you-go khi có lưu lượng thực).
- Biên độ an toàn tối đa: <= $30.00 USD / tháng.

### New cost introduced in current phase:
- $0.00 USD (Không phát sinh bất kỳ chi phí mới nào. Zero Redis, Zero new Supabase projects, Zero new databases).

### Budget status:
WITHIN_BUDGET

---

## COMPLETED
- [x] **Phase 06D — Pre-Apply Blocker Fix:**
  - Đối soát chính xác số lượng bảng mới: **15 bảng mới** (`ai_tasks`, `ai_task_steps`, `ai_outputs`, `nodes`, `node_heartbeats`, `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`, `github_projects`, `github_reviews`, `github_versions`) + 1 bảng mở rộng (`audit_logs`).
  - Kiểm tra an ninh toàn diện 15 bảng mới: **100% PASS** (RLS Enabled, đầy đủ covering indexes).
  - Cấu hình GitHub Radar Server-Only: RLS bật, không mở policy client (service-role access only).
  - Bảng `public.orders`: Giữ nguyên 100% mục đích thanh toán hiện tại; **tuyệt đối không dùng cho AI compute usage / token deduction**.
  - Hệ thống AI Credit: **DEFERRED** trong V1 (không tạo bảng credit/wallet).
  - Phạm vi `audit_logs`: Tái sử dụng giới hạn cho User/Admin actions; node state đưa vào `nodes`/`node_heartbeats`, worker runtime đưa vào structured logger; giữ nguyên ràng buộc NOT NULL.
  - Hàng đợi: Duy nhất **PGMQ Durable Basic Queue** (`ai-jobs`), không lộ `pgmq_public` ra client, không dùng bảng `queue_messages`, không dùng Redis.
  - Báo cáo chính thức ban hành: `docs/HUYAI_FINAL_PREAPPLY_REPORT.md`.
- [x] **Phase 06C — Final Migration Reconciliation:**
  - Cập nhật toàn bộ 19 bảng hiện hữu trên `HuyAI` Singapore.
  - Xóa bỏ 100% dữ liệu seed danh mục mô hình & công cụ trong migration 03.
  - Phân tách riêng biệt `LEGACY_SECURITY_BASELINE` và chuẩn bị `OPTIONAL_LEGACY_REMEDIATION_PLAN`.
- [x] **Phase 06B — HuyAI Control Center Database Preparation:**
  - Kiểm toán READ-ONLY trực tiếp cơ sở dữ liệu `HuyAI` Singapore (`bdeluacbzbdflxubhpha`).
  - Ban hành các tài liệu schema, migration, RLS matrix, queue plan.
- [x] **Master Architecture Patch V1.1 & Phase 06A Reconciliation:**
  - Ban hành ADR-001 (Consolidate HuyAI) và ADR-002 (Cost-Optimized V1).
- [x] **Phases 01 → 06:** Foundation, Monorepo, Contracts, API Routes, Next.js Web Dashboard, Dell Dispatcher Worker.

## IN_PROGRESS
- Không có (Phase 06D hoàn thành toàn diện, đang DỪNG chờ phê duyệt trước khi apply lên database).

## PENDING
- [ ] Review & Human Approval từ Lead Architect / Sponsor đối với 5 tệp SQL migration và Kế hoạch Migration HuyAI.
- [ ] Tiến hành bước tiếp theo (Phase 07 — Integration & Deployment Preparation hoặc chỉ thị riêng).

---

## DATABASE_STATE
- **Production Supabase của 3 Website:** 100% nguyên vẹn (Zero-Touch, DDL APPLIED: ZERO).
- **19 Bảng Sản Xuất Hiện Hữu tại HuyAI:** `contacts`, `videos`, `resources`, `resource_views`, `premium_contents`, `item_reviews`, `audit_logs`, `user_activity_metrics`, `student_points_balance`, `daily_tasks`, `task_completions`, `cms_folders`, `orders`, `cms_settings`, `knowledge_chunks`, `user_video_progress`, `user_document_progress`, `leads`, `site_content`.
- **HuyAI Control Center Migrations Chuẩn Bị:** 5 tệp SQL an toàn (`20260920000001` - `20260920000005`) tại `supabase/migrations/` tạo chính xác 15 bảng mới và mở rộng 1 bảng cũ (`audit_logs`), sẵn sàng apply ngay sau khi được con người phê duyệt.

## API_STATE
- Endpoints hoạt động tại `apps/control-center/src/app/api/ai/...`:
  - `POST /api/ai/tasks`
  - `GET /api/ai/tasks/:id`
  - `POST /api/ai/tasks/:id/cancel`
  - `GET /api/ai/tasks/:id/outputs`
  - `GET /api/ai/history`

## FRONTEND_STATE
- `apps/control-center`: Next.js 15, React 19, Tailwind CSS. Toàn bộ 14 routes tĩnh và động biên dịch thành công, typecheck 0 lỗi.

## WORKER_STATE
- `apps/dispatcher`: Hoàn chỉnh với `MockAdapter`, `TaskRouter`, `ResultHandler`, `QueuePoller`, `HeartbeatManager`, `HealthServer` (cổng 8080 `/health`, `/ready`). Sẵn sàng chạy container hoặc Coolify.

---

## TEST_STATUS
- **SQL Migration Static Validation:** PASS (5/5 migrations tuân thủ UUID, timestamps, search_path, RLS, no secrets, non-destructive, 15 new tables).
- **Contracts Unit Tests:** PASS (14/14 tests).
- **API Logic Tests:** PASS (6/6 tests).
- **Dispatcher Tests:** PASS (7/7 tests).
- **Shared Tests:** PASS (3/3 tests).
- **TypeScript Compile:** PASS (5/5 workspaces).
- **Next.js Production Build:** PASS (14/14 routes).
- **Tổng cộng:** 30/30 unit & integration tests PASS (100% Passed).

## KNOWN_ISSUES
- Không có.

## DECISIONS
1. **Existing HuyAI Consolidation:** Không tạo Supabase project mới; chuẩn bị migration mở rộng trực tiếp trên dự án `HuyAI` Singapore (`bdeluacbzbdflxubhpha`).
2. **Cost-Optimized V1 & Dual Queue:** Ưu tiên `pgmq` queue `ai-jobs` nếu được hỗ trợ, kèm fallback chắc chắn bằng bảng `queue_messages` và `FOR UPDATE SKIP LOCKED` (Zero-Redis, Zero-Upstash, $0 chi phí).
3. **Chống Trùng Lặp Nghiệp Vụ:** Không tạo bảng `users` (dùng `auth.users`), không tạo bảng ví điểm mới làm sai lệch `student_points_balance`, tái sử dụng `orders` và mở rộng an toàn `audit_logs`.
4. **Dell Precision M4800 Role:** Nút tính toán nội bộ (`huy-ai-node-01`) chạy Coolify, Traefik, Cloudflare Tunnel, ops.huycncdsai.io.vn; đảm nhiệm worker điều phối và Langflow.

## NEXT_ACTION
DỪNG LẠI và chờ phê duyệt chính thức của Lead Architect trước khi thực hiện bất kỳ lệnh áp dụng nào lên cơ sở dữ liệu HuyAI Singapore.
