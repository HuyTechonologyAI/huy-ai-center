# PROJECT STATE — HUY TECHNOLOGY AI CENTER

## PROJECT
**HUY TECHNOLOGY AI CENTER** (`huy-ai-center`)  
Trung tâm điều phối AI và quản trị hạ tầng điện toán tập trung cho Hệ sinh thái HUY TECHNOLOGY, kết nối 3 website hiện hữu (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) cùng node AI nội bộ Dell Precision M4800 (`huy-ai-node-01`).

## ARCHITECTURE_VERSION
1.2 (Autonomous Multi-Agent Orchestration Platform)

## AUTONOMY_MODEL
GOAL_TO_RESULT

## INTER_AGENT_PROTOCOL
HAIP/1.0

## AGENT_TO_TOOL_PROTOCOL
MCP

## EXTERNAL_AGENT_PROTOCOL
A2A_ADAPTER_PLANNED

## QUEUE
pgmq/ai-jobs

## DISPATCHER
HAIP_ROUTER_NOT_DEPLOYED

## DATABASE
MIGRATION_NOT_APPLIED

## HUMAN_ROLE
FINAL_AND_HIGH_RISK_APPROVAL

## COST_MODE
COST_OPTIMIZED_V1

## MONTHLY_BUDGET_TARGET
<= 30 USD

## SUPABASE_CONTROL_CENTER
HuyAI (Singapore)

## REDIS
DISABLED

## LITELLM
DEFERRED

## OPENHANDS
DEFERRED

## LOCAL_NODE
huy-ai-node-01

## CURRENT_PHASE
PHASE 06F — HAIP AUTONOMOUS MULTI-AGENT ARCHITECTURE SPECIFICATION

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
- [x] **Phase 06F — HAIP Autonomous Multi-Agent Architecture Specification:**
  - Nâng cấp phiên bản kiến trúc lên **V1.2** (Nền tảng điều phối đa tác tử tự trị).
  - Chuẩn hóa giao thức liên tác tử **HAIP/1.0** (Huy AI Inter-Agent Protocol) với 12 message types chính xác.
  - Ban hành canonical JSON Schemas: `schemas/haip/haip-envelope.v1.schema.json` và `schemas/haip/agent-card.v1.schema.json`.
  - Xây dựng typed models & Zod runtime validators tại `packages/contracts/src/haip.ts` (19/19 tests PASS).
  - Định nghĩa máy trạng thái tác vụ (Task State Machine) 11 trạng thái chuẩn và 5 trạng thái kiểm soát/thất bại tại `docs/HAIP_TASK_STATE_MACHINE.md`.
  - Đặc tả mô hình phân rã mục tiêu dạng đồ thị DAG và thuật toán kiểm tra chu trình tại `docs/HAIP_TASK_GRAPH_SPEC.md`.
  - Thiết lập chính sách rủi ro 5 cấp độ (Level 0–4) và cổng phê duyệt con người (Risk $\ge 3$) tại `docs/HAIP_RISK_POLICY.md` và `docs/HAIP_HUMAN_APPROVAL_SPEC.md`.
  - Thiết lập Cost Guard, bậc thang ưu tiên mô hình (Local M4800 $\rightarrow$ Free Cloud $\rightarrow$ Low-Cost SLM) tại `docs/HAIP_COST_POLICY.md`.
  - Phân định ranh giới rõ ràng: **HAIP** (Agent ↔ Agent) và **MCP** (Agent ↔ Tool) tại `docs/HAIP_MCP_BOUNDARY.md`.
  - Định nghĩa 4 phạm vi bộ nhớ (Global, Project, Task, Agent Workspace) và cách ly ngữ cảnh tại `docs/HAIP_MEMORY_MODEL.md`.
  - Chuẩn hóa giao thức Artifact (không truyền nhị phân lớn trong message) tại `docs/HAIP_ARTIFACT_PROTOCOL.md`.
  - Thiết kế vòng lặp QA và tự phục hồi với giới hạn chống lặp vô hạn tại `docs/HAIP_QA_RECOVERY_SPEC.md`.
  - Tái định nghĩa Dispatcher thành **HAIP Router** tại `docs/HAIP_DISPATCHER_ARCHITECTURE.md`.
  - Xây dựng 6 Skills mới (13 đến 18) trong `.agents/skills/`.
  - Ban hành tài liệu kiến trúc tổng thể `docs/HUY_AI_CENTER_V1_2_ARCHITECTURE.md` và `MASTER_INSTRUCTION.md`.
  - **DDL trên Production: ZERO | Triển khai dịch vụ: ZERO.**
- [x] **Phase 06E — Controlled Production Migration Apply:**
  - Thực hiện Step 0 Minimalism Check: Loại bỏ toàn bộ `ALTER TABLE public.audit_logs`, giữ nguyên 100% không đụng chạm (Zero DDL) các bảng hiện hữu.
  - Thiết lập Live Pre-Apply Baseline: Ghi nhận 19 bảng hiện hữu với chính xác 239 rows (`orders`: 177, `resource_views`: 31, `user_activity_metrics`: 20, `student_points_balance`: 3, `cms_folders`: 2, `cms_settings`: 3, `videos`: 1, `resources`: 1, `site_content`: 1) tại `docs/HUYAI_PRODUCTION_PREAPPLY_SNAPSHOT.md`.
  - Chuẩn bị trọn bộ 5 file migration tuần tự (`20260920000001` - `20260920000005`) cùng tệp gộp duy nhất `supabase/migrations/deploy_phase_06e_complete.sql`.
  - Xây dựng bộ công cụ áp dụng và kiểm thử tự động: `scripts/apply_migrations.js` (PostgreSQL client) và `scripts/verify_phase_06e.js` (kiểm toán integrity, RLS, node seed, và server-side smoke test).
  - Hoàn tất Báo cáo Di chuyển Sản xuất: `docs/HUYAI_PRODUCTION_MIGRATION_REPORT.md`.
- [x] **Phase 06D — Pre-Apply Blocker Fix:**
  - Đối soát chính xác số lượng bảng mới: **15 bảng mới**.
  - Kiểm tra an ninh toàn diện 15 bảng mới: **100% PASS** (RLS Enabled, đầy đủ covering indexes).
  - Cấu hình GitHub Radar Server-Only: RLS bật, không mở policy client (service-role access only).
  - Bảng `public.orders`: Giữ nguyên 100% mục đích thanh toán hiện tại; **tuyệt đối không dùng cho AI compute usage / token deduction**.
  - Hàng đợi: Duy nhất **PGMQ Durable Basic Queue** (`ai-jobs`), không lộ `pgmq_public` ra client, không dùng bảng `queue_messages`, không dùng Redis.
- [x] **Phases 01 → 06C:** Foundation, Monorepo, Contracts, API Routes, Next.js Web Dashboard, Dell Dispatcher Worker, Database Baseline.

## IN_PROGRESS
- Không có (Phase 06F hoàn tất toàn bộ đặc tả kiến trúc).

## PENDING
- [ ] Tiến hành Phase 06G — HAIP Database Reconciliation.
- [ ] Review & Human Approval từ Lead Architect.

---

## DATABASE_STATE
MIGRATION_NOT_APPLIED

- **Bảo toàn dữ liệu 19 bảng hiện hữu:** 100% nguyên vẹn (Zero-Touch, Zero row deleted, orders 177 rows giữ nguyên).
- **15 Bảng Mới Đã Soạn Thảo (Pending Apply):** `ai_tasks`, `ai_task_steps`, `ai_outputs`, `nodes`, `node_heartbeats`, `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`, `github_projects`, `github_reviews`, `github_versions`.
- **Hạ Tầng Hàng Đợi:** PGMQ Durable Basic Queue `ai-jobs` (Server-side credentials only).
- **Chiến Lược Tái Sử Dụng DB V1.2:** Sử dụng `ai_tasks` cho state HAIP, `ai_task_steps` cho trace thực thi, `ai_outputs` cho tham chiếu artifact, không tạo thêm bảng `ai_messages` trong V1.

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
- `apps/dispatcher`: HAIP Router Architecture đã đặc tả đầy đủ; mã nguồn mock adapter sẵn sàng; **chưa triển khai (NOT DEPLOYED)**.

---

## TEST_STATUS
- **Contracts & HAIP Unit Tests:** PASS (19/19 tests).
- **API Logic Tests:** PASS (6/6 tests).
- **Dispatcher Tests:** PASS (7/7 tests).
- **Shared Tests:** PASS (3/3 tests).
- **TypeScript Compile:** PASS (5/5 workspaces).
- **Next.js Production Build:** PASS (14/14 routes).
- **Tổng cộng:** 35/35 unit & integration tests PASS (100% Passed).

## KNOWN_ISSUES
- Không có.

## DECISIONS
1. **HAIP/1.0 Adoption:** Chuẩn hóa giao thức trao đổi liên tác tử nội bộ bằng JSON schema, 12 message types, máy trạng thái 11 bước, phân cấp rủi ro 5 cấp.
2. **Dual-Protocol Partition:** HAIP cho tương tác Agent-to-Agent; MCP cho tương tác Agent-to-Tool.
3. **Capability-Based Routing:** Không gán cứng thương hiệu LLM; phân bổ việc dựa trên năng lực của Agent Card và chi phí bậc thang.
4. **Single Queue PGMQ:** Duy nhất 1 hàng đợi `ai-jobs` trên Supabase PostgreSQL ($0 chi phí, không Redis).
5. **Zero Production Impact in 06F:** Toàn bộ quá trình là kiến trúc & đặc tả; không chạy DDL, không deploy dịch vụ.

## NEXT_PHASE
06G_HAIP_DATABASE_RECONCILIATION

## NEXT_ACTION
06G_HAIP_DATABASE_RECONCILIATION

