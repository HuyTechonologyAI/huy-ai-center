# PROJECT STATE — HUY TECHNOLOGY AI CENTER

## PROJECT
**HUY TECHNOLOGY AI CENTER** (`huy-ai-center`)  
Trung tâm điều phối AI và quản trị hạ tầng điện toán tập trung cho Hệ sinh thái HUY TECHNOLOGY, kết nối 3 website hiện hữu (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) cùng node AI nội bộ Dell Precision M4800 (`huy-ai-node-01`).

## CURRENT_PHASE
Phase 03: Supabase Control Center Database (DONE — Sẵn sàng cho Staging, KHÔNG áp dụng lên Production)

## CURRENT_BRANCH
`feat/supabase-control-center`

---

## COMPLETED
- [x] **Phase 01 — System Audit:** Kiểm toán READ-ONLY 3 website hiện hữu, lập tài liệu kiểm kê, kiến trúc hiện tại, quản trị rủi ro và gap analysis.
- [x] **Phase 02 — AI Center Foundation:** Chuẩn hóa Monorepo, 10 Agent Skills, Contracts (8 thực thể, 7 trạng thái task), Dispatcher HTTP health server, Control Center tinh giản, CI workflow.
- [x] **Phase 03 — Supabase Control Center Schema:**
  - **Identity & Multi-tenancy:** Soạn thảo `profiles`, `organizations`, `organization_members` (hỗ trợ `individual`, `organization`, `school`, `business`).
  - **Billing & Credits:** Soạn thảo `plans`, `subscriptions`, `credit_wallets`, `credit_transactions`.
  - **AI Tasks & Pipeline:** Soạn thảo `ai_tasks`, `ai_task_steps`, `ai_outputs`.
  - **AI Registry:** Soạn thảo `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`.
  - **GitHub Radar:** Soạn thảo `github_projects`, `github_reviews`, `github_versions`.
  - **Infrastructure:** Soạn thảo `nodes` (Dell M4800 `huy-ai-node-01` & cloud workers), `node_heartbeats`.
  - **Governance:** Soạn thảo `audit_logs` bất biến.
  - **Storage Design:** Cấu hình 5 buckets (`user-uploads`, `ai-outputs`, `knowledge`, `tool-assets`, `avatars`) kèm RLS policies.
  - **PostgreSQL Native Queues (Zero-Redis V1):** Thiết lập `queue_messages` và hàm `claim_queue_message()` cho 4 hàng đợi (`ai-jobs`, `github-scan`, `notifications`, `maintenance`) sử dụng cơ chế `FOR UPDATE SKIP LOCKED`.
- [x] **Tài liệu Kiến trúc & Thiết kế Phân hệ:**
  - [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) (kèm Mermaid ER Diagram toàn diện).
  - [docs/RLS_POLICY_MATRIX.md](docs/RLS_POLICY_MATRIX.md) (ma trận phân quyền chi tiết cho tất cả các bảng).
  - [docs/STORAGE_DESIGN.md](docs/STORAGE_DESIGN.md) (đặc tả dung lượng, MIME và đường dẫn lưu trữ).
  - [docs/QUEUE_DESIGN.md](docs/QUEUE_DESIGN.md) (kiến trúc hàng đợi phi tập trung Zero-Redis V1).
- [x] **Kiểm tra Toàn vẹn Tĩnh (Static Validation):**
  - Kịch bản `scripts/validate-sql.ps1` kiểm tra cú pháp 5 file SQL migration, bảo đảm UUID, primary key, timestamps, RLS enablement và 0 secret lộ lọt (100% PASS).

## IN_PROGRESS
- Không có (Phase 03 đã hoàn thành đầy đủ).

## PENDING
- [ ] Review & Human Approval cho toàn bộ thiết kế Database Schema Phase 03.
- [ ] Review & Merge branch `feat/supabase-control-center` vào `main`.
- [ ] Phase 04: Control Center Queue Management & Telemetry UI.
- [ ] Phase 05: Dell Precision M4800 Onboarding & Local AI Dispatcher Integration.

---

## DATABASE_STATE
- **Production Supabase của 3 Website:** 100% nguyên vẹn (Zero-Touch Rule).
- **Control Center Migrations (Staging/Dev Ready):**
  - `20260917000001_create_ai_task_queue.sql`: Hàng đợi tác vụ cơ sở.
  - `20260917000002_identity_and_billing.sql`: Identity, Multi-tenancy, Plans, Subscriptions, Wallets.
  - `20260917000003_ai_tasks_and_registry.sql`: AI Tasks, Pipeline Steps, Outputs, Model & Tool Registry.
  - `20260917000004_radar_infra_governance.sql`: GitHub Radar, Nodes, Telemetry, Audit Logs.
  - `20260917000005_storage_and_queues.sql`: 5 Storage Buckets & 4 PostgreSQL Native Queues.
- **Trạng thái:** Toàn bộ SQL nằm ở dạng tệp migration, **chưa áp dụng lên bất kỳ Production DB nào**.

## API_STATE
- Package `@huy-ai/contracts`: Đồng bộ 100% với schema `ai_tasks`, `ai_task_steps`, `ai_outputs`, `nodes`, `agents`, `tools`.
- Control Center `/api/tasks`: API route sẵn sàng.
- Dispatcher `/health`, `/ready`: HTTP server port 8080 hoạt động.

## FRONTEND_STATE
- `apps/control-center`: Next.js App Router, minimal dependencies, typecheck 0 lỗi.

## WORKER_STATE
- `apps/dispatcher`: 12-factor daemon, 4 AI adapters, health check server, graceful shutdown, typecheck 0 lỗi, tests pass.

---

## TEST_STATUS
- **SQL Static Validation:** PASS (5/5 migration files đạt chuẩn UUID, RLS, Indexes, Constraints).
- **Safety & Secret Scan:** PASS (0 file .env bị theo dõi, 0 secret lộ).
- **TypeScript Compile:** PASS (0 lỗi trên toàn bộ 5 packages và apps).
- **Unit Tests:** PASS (12/12 tests passed).

## KNOWN_ISSUES
- Không có.

## DECISIONS
1. **Zero-Redis V1 Architecture:** Tận dụng triệt để tính năng `FOR UPDATE SKIP LOCKED` của PostgreSQL trên Supabase cho 4 hàng đợi (`ai-jobs`, `github-scan`, `notifications`, `maintenance`), loại bỏ chi phí vận hành và rủi ro mất kết nối Redis trong giai đoạn V1.
2. **Modular Migrations:** Chia tách schema thành 5 tệp migration độc lập theo phân hệ chức năng, giúp việc kiểm tra, review và rollback dễ dàng, có cấu trúc rõ ràng.
3. **No Production Apply:** Tuân thủ tuyệt đối quy tắc an toàn: Không apply SQL migration lên production Supabase khi chưa có sự phê duyệt riêng từ con người.

## NEXT_ACTION
Báo cáo kết quả hoàn thành Phase 03 và dừng lại chờ phê duyệt review từ người dùng.
