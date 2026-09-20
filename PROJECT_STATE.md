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
PHASE 06B — HUYAI CONTROL CENTER DATABASE PREPARATION COMPLETED (Pending Human Approval to Apply)

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
- [x] **Phase 06B — HuyAI Control Center Database Preparation:**
  - Kiểm toán READ-ONLY trực tiếp cơ sở dữ liệu `HuyAI` Singapore (`bdeluacbzbdflxubhpha`): xác định chính xác 13 bảng sản xuất đang chạy (`resources`, `videos`, `contacts`, `leads`, `student_points_balance`, `daily_tasks`, `task_completions`, `user_document_progress`, `user_video_progress`, `knowledge_chunks`, `item_reviews`, `orders`, `audit_logs`).
  - Xác nhận `pgvector` đang hoạt động, `pgmq` chưa kích hoạt, chưa có lịch sử migration trên HuyAI.
  - Ban hành 4 tài liệu thiết kế & an toàn bắt buộc:
    - `docs/HUYAI_FINAL_SCHEMA_PLAN.md` (Kế hoạch schema mở rộng, nguyên tắc chống trùng lặp dữ liệu)
    - `docs/HUYAI_MIGRATION_PLAN.md` (Trình tự migration an toàn, pre/post-checks, rollback notes chi tiết)
    - `docs/HUYAI_RLS_MATRIX.md` (Ma trận RLS 100% bảng, kiểm soát quyền server-side, bảo vệ search_path)
    - `docs/HUYAI_QUEUE_PLAN.md` (Kiến trúc hàng đợi 2 tầng: pgmq ưu tiên + Postgres native queue fallback)
  - Chuẩn bị 5 tệp SQL migration an toàn, lũy tích, không phá hủy dữ liệu (`supabase/migrations/`):
    - `20260920000001_ai_operations.sql`
    - `20260920000002_infrastructure.sql`
    - `20260920000003_ai_registry.sql`
    - `20260920000004_github_radar.sql`
    - `20260920000005_queue_and_governance.sql`
  - Chống trùng lặp 100%: Tái sử dụng `auth.users`, `student_points_balance`, `orders`, `knowledge_chunks`, mở rộng không phá hủy `audit_logs`.
  - Xác thực tĩnh SQL (`validate-sql.ps1`) và chạy kiểm thử an toàn (`verify-safety.ps1`): PASS 100% (30/30 unit tests pass, typecheck 5 workspaces pass, 0 secrets).
- [x] **Master Architecture Patch V1.1 & Phase 06A Reconciliation:**
  - Lập Gap Analysis `docs/HUYAI_CONTROL_CENTER_GAP_ANALYSIS.md`, `docs/HUYAI_SECURITY_BASELINE.md`, `docs/V1_1_RECONCILIATION_REPORT.md`.
  - Ban hành ADR-001 (Consolidate HuyAI) và ADR-002 (Cost-Optimized V1).
  - Kích hoạt agent skills và bảng chi phí `docs/INFRASTRUCTURE_COSTS.md`.
- [x] **Phase 01 — System Audit:** Kiểm toán READ-ONLY 3 website hiện hữu.
- [x] **Phase 02 — AI Center Foundation:** Monorepo, contracts, shared utils, CI workflow.
- [x] **Phase 03 — Supabase Control Center Schema:** Khung thiết kế sơ bộ các bảng điều khiển trung tâm.
- [x] **Phase 04 — AI Task API Contract:** 5 Endpoints API, Idempotency key, Standard error model.
- [x] **Phase 05 — Control Center Web Application:** Dashboard Next.js 15, Teacher AI form chuẩn CV 5512.
- [x] **Phase 06 — Dell Dispatcher Worker:** Worker daemon, MockAdapter, TaskRouter, ResultHandler, Dockerfile.

## IN_PROGRESS
- Không có (Phase 06B hoàn thành toàn diện, đang DỪNG chờ phê duyệt trước khi apply lên database).

## PENDING
- [ ] Review & Human Approval từ Lead Architect / Sponsor đối với 5 tệp SQL migration và Kế hoạch Migration HuyAI.
- [ ] Tiến hành bước tiếp theo (Phase 07 — Integration & Deployment Preparation hoặc chỉ thị riêng).

---

## DATABASE_STATE
- **Production Supabase của 3 Website:** 100% nguyên vẹn (Zero-Touch, chưa chạy bất kỳ lệnh DDL nào).
- **13 Bảng Sản Xuất Hiện Hữu tại HuyAI:** `resources`, `videos`, `contacts`, `leads`, `student_points_balance`, `daily_tasks`, `task_completions`, `user_document_progress`, `user_video_progress`, `knowledge_chunks`, `item_reviews`, `orders`, `audit_logs`.
- **HuyAI Control Center Migrations Chuẩn Bị:** 5 tệp SQL an toàn (`20260920000001` - `20260920000005`) tại `supabase/migrations/` sẵn sàng apply ngay sau khi được con người phê duyệt.

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
- **SQL Migration Static Validation:** PASS (5/5 migrations tuân thủ UUID, timestamps, search_path, RLS, no secrets, non-destructive).
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
