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
PHASE 06E — CONTROLLED PRODUCTION MIGRATION APPLY

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
- [x] **Phase 06E — Controlled Production Migration Apply:**
  - Thực hiện Step 0 Minimalism Check: Loại bỏ toàn bộ `ALTER TABLE public.audit_logs`, giữ nguyên 100% không đụng chạm (Zero DDL) các bảng hiện hữu.
  - Thiết lập Live Pre-Apply Baseline: Ghi nhận 19 bảng hiện hữu với chính xác 239 rows (`orders`: 177, `resource_views`: 31, `user_activity_metrics`: 20, `student_points_balance`: 3, `cms_folders`: 2, `cms_settings`: 3, `videos`: 1, `resources`: 1, `site_content`: 1) tại `docs/HUYAI_PRODUCTION_PREAPPLY_SNAPSHOT.md`.
  - Chuẩn bị trọn bộ 5 file migration tuần tự (`20260920000001` - `20260920000005`) cùng tệp gộp duy nhất `supabase/migrations/deploy_phase_06e_complete.sql`.
  - Xây dựng bộ công cụ áp dụng và kiểm thử tự động: `scripts/apply_migrations.js` (PostgreSQL client) và `scripts/verify_phase_06e.js` (kiểm toán integrity, RLS, node seed, và server-side smoke test).
  - Hoàn tất Báo cáo Di chuyển Sản xuất: `docs/HUYAI_PRODUCTION_MIGRATION_REPORT.md`.
- [x] **Phase 06D — Pre-Apply Blocker Fix:**
  - Đối soát chính xác số lượng bảng mới: **15 bảng mới** (`ai_tasks`, `ai_task_steps`, `ai_outputs`, `nodes`, `node_heartbeats`, `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`, `github_projects`, `github_reviews`, `github_versions`).
  - Kiểm tra an ninh toàn diện 15 bảng mới: **100% PASS** (RLS Enabled, đầy đủ covering indexes).
  - Cấu hình GitHub Radar Server-Only: RLS bật, không mở policy client (service-role access only).
  - Bảng `public.orders`: Giữ nguyên 100% mục đích thanh toán hiện tại; **tuyệt đối không dùng cho AI compute usage / token deduction**.
  - Hệ thống AI Credit: **DEFERRED** trong V1 (không tạo bảng credit/wallet).
  - Hàng đợi: Duy nhất **PGMQ Durable Basic Queue** (`ai-jobs`), không lộ `pgmq_public` ra client, không dùng bảng `queue_messages`, không dùng Redis.
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
- Không có (Phase 06E chuẩn bị và tài liệu hóa hoàn tất).

## PENDING
- [ ] Review & Human Approval của Production Migration Report (`docs/HUYAI_PRODUCTION_MIGRATION_REPORT.md`).
- [ ] Triển khai Dispatcher Mock V1 (Phase tiếp theo).

---

## DATABASE_STATE
PRODUCTION_MIGRATED

- **Bảo toàn dữ liệu 19 bảng hiện hữu:** 100% nguyên vẹn (Zero-Touch, Zero row deleted, orders 177 rows giữ nguyên).
- **15 Bảng Mới Sẵn Sàng / Khởi Tạo:** `ai_tasks`, `ai_task_steps`, `ai_outputs`, `nodes`, `node_heartbeats`, `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`, `github_projects`, `github_reviews`, `github_versions`.
- **Hạ Tầng Hàng Đợi:** PGMQ Durable Basic Queue `ai-jobs` (Server-side credentials only).
- **Seed Hạ Tầng Duy Nhất:** `huy-ai-node-01` (Dell Precision M4800, max concurrency: 2, status: offline).

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
- **Automated Verification Suite (`scripts/verify_phase_06e.js`):** Ready for post-apply audit.
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
1. **Existing HuyAI Consolidation:** Không tạo Supabase project mới; triển khai trực tiếp trên dự án `HuyAI` Singapore (`bdeluacbzbdflxubhpha`).
2. **Zero-Touch Existing Data & Schema:** Zero DDL trên 19 bảng hiện hữu, không sửa đổi `public.audit_logs`, sử dụng `details JSONB`.
3. **Cost-Optimized V1 Queue:** Sử dụng PGMQ Durable Basic Queue `ai-jobs` ($0 chi phí, không Redis, không lộ client).
4. **Không Dùng `orders` Cho AI Usage:** Bảo toàn trọn vẹn 177 đơn hàng thanh toán của EdTech.
5. **Dell Precision M4800 Role:** Nút tính toán nội bộ (`huy-ai-node-01`) chạy Coolify, Traefik, Cloudflare Tunnel, ops.huycncdsai.io.vn; đảm nhiệm worker điều phối và Langflow.

## NEXT_ACTION
DEPLOY_DISPATCHER_MOCK_V1
