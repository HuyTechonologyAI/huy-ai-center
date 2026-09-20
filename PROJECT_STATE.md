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

## HAIP_DATABASE_MAPPING
READY

## EXPECTED_EXISTING_PUBLIC_TABLES
19

## EXPECTED_NEW_PUBLIC_TABLES
15

## EXPECTED_FINAL_PUBLIC_TABLES
34

## AGENT_TO_TOOL_PROTOCOL
MCP

## EXTERNAL_AGENT_PROTOCOL
A2A_ADAPTER_PLANNED

## QUEUE
pgmq/ai-jobs

## QUEUE_DELIVERY
AT_LEAST_ONCE

## IDEMPOTENCY
ENFORCED

## CLIENT_INTERNAL_TRACE_ACCESS
DENIED

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
PHASE 06G — HAIP DATABASE RECONCILIATION V1.2

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
- [x] **Phase 06G — HAIP Database Reconciliation V1.2:**
  - Đối soát và dung hợp toàn diện 5 file migration hiện có với Kiến trúc Đa tác tử tự trị HAIP V1.2.
  - Bảo toàn tuyệt đối kiến trúc **15 bảng mới** (Tổng 34 bảng sau migration, Zero-Table-Addition).
  - Không tạo các bảng trùng lặp/dư thừa: `ai_messages`, `ai_task_dependencies`, `approvals`, `agent_events`, `queue_messages`, `dead_letter_messages`, `credit_transactions`, `ai_usage_events`.
  - Thiết lập đồ thị DAG qua mảng `depends_on UUID[]` có chỉ mục GIN trên `public.ai_tasks`.
  - Cài đặt trigger chuyển trạng thái xác định `check_ai_task_status_transition()` khóa 4 trạng thái kết thúc (`COMPLETED`, `FAILED`, `CANCELLED`, `EXPIRED`) và tăng `state_version`.
  - Lưu trữ 12 loại thông điệp HAIP/1.0 trong `public.ai_task_steps` (`message_id UUID UNIQUE`, `idempotency_key UNIQUE`, `envelope JSONB`).
  - Thiết lập RLS phân quyền rõ ràng: **Owner-Read** (`ai_tasks`, `ai_outputs`) và **Server-Only** (`ai_task_steps`, `nodes`, `node_heartbeats`, `agents`, `tools`, `github_*`). Client hoàn toàn bị chặn truy cập trace và prompt nội bộ.
  - Khởi tạo Durable Basic Queue `ai-jobs` và các hàm RPC bảo mật (`haip_enqueue_job`, `haip_read_jobs`, `haip_archive_job`, `claim_ai_task`) cấp quyền duy nhất cho `service_role`.
  - Giữ nguyên 100% không đụng chạm (Zero DDL) trên 19 bảng sản xuất hiện hữu (`contacts`, `videos`, `orders` [177 rows], `audit_logs`...).
  - Ban hành 5 tài liệu nghiệp vụ kiến trúc: `HAIP_DATABASE_MAPPING.md`, `HAIP_DATABASE_STATE_TRANSITIONS.md`, `HAIP_IDEMPOTENCY_MODEL.md`, `HAIP_QUEUE_DELIVERY_MODEL.md`, `HAIP_DATABASE_INDEX_PLAN.md`.
  - Cập nhật hợp đồng TypeScript `packages/contracts/src/haip.ts` và bộ kiểm thử đối soát tính tương đồng `haip-parity.test.ts` (40/40 tests toàn monorepo PASS 100%).
  - **DDL trên Production: ZERO | Triển khai dịch vụ: ZERO.**
- [x] **Phase 06F — HAIP Autonomous Multi-Agent Architecture Specification:**
  - Nâng cấp phiên bản kiến trúc lên **V1.2** (Nền tảng điều phối đa tác tử tự trị).
  - Chuẩn hóa giao thức liên tác tử **HAIP/1.0** (Huy AI Inter-Agent Protocol) với 12 message types chính xác.
  - Ban hành canonical JSON Schemas: `schemas/haip/haip-envelope.v1.schema.json` và `schemas/haip/agent-card.v1.schema.json`.
  - Định nghĩa máy trạng thái tác vụ 16 trạng thái tại `docs/HAIP_TASK_STATE_MACHINE.md`.
  - Xây dựng 6 Skills mới (13 đến 18) trong `.agents/skills/`.
- [x] **Phase 06E — Controlled Production Migration Apply:**
  - Ghi nhận Live Pre-Apply Baseline: 19 bảng hiện hữu với 239 rows tại `docs/HUYAI_PRODUCTION_PREAPPLY_SNAPSHOT.md`.
  - Chuẩn bị trọn bộ 5 file migration tuần tự cùng script gộp `deploy_phase_06g_complete.sql`.
- [x] **Phases 01 → 06D:** Foundation, Monorepo, Contracts, API Routes, Next.js Web Dashboard, Dell Dispatcher Worker, Database Baseline.

## IN_PROGRESS
- Không có (Phase 06G hoàn tất toàn bộ đối soát cơ sở dữ liệu).

## PENDING
- [ ] Phê duyệt của con người (Human Approval) trước khi chạy migration vào Supabase Production `HuyAI`.
- [ ] Tiến hành Phase 06H — Controlled Production Migration Apply.

---

## DATABASE_STATE
MIGRATION_NOT_APPLIED

- **Bảo toàn dữ liệu 19 bảng hiện hữu:** 100% nguyên vẹn (Zero-Touch, Zero row deleted, orders 177 rows giữ nguyên).
- **15 Bảng Mới Đã Đối Soát (Pending Apply):** `ai_tasks`, `ai_task_steps`, `ai_outputs`, `nodes`, `node_heartbeats`, `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`, `github_projects`, `github_reviews`, `github_versions`.
- **Hạ Tầng Hàng Đợi:** PGMQ Durable Basic Queue `ai-jobs` (Server-side credentials only via RPCs).
- **Chiến Lược Tái Sử Dụng DB V1.2:** Dung hợp hoàn toàn vào 15 bảng; không tạo bảng thừa.

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
- `apps/dispatcher`: HAIP Router Architecture đã đối soát và cập nhật; **chưa triển khai (NOT DEPLOYED)**.

---

## TEST_STATUS
- **Contracts & HAIP Unit Tests:** PASS (24/24 tests).
- **API Logic Tests:** PASS (6/6 tests).
- **Dispatcher Tests:** PASS (7/7 tests).
- **Shared Tests:** PASS (3/3 tests).
- **TypeScript Compile:** PASS (5/5 workspaces).
- **Tổng cộng:** 40/40 unit & integration tests PASS (100% Passed).

## KNOWN_ISSUES
- Không có.

## DECISIONS
1. **15-Table Architecture Preserved:** 100% yêu cầu của HAIP V1.2 được ánh xạ vào 15 bảng mới đã chuẩn bị, giữ tổng số bảng public là 34 (19 cũ + 15 mới).
2. **DAG in `depends_on UUID[]`:** Sử dụng PostgreSQL array kết hợp GIN index thay cho bảng phụ `ai_task_dependencies`.
3. **Internal Trace Access Denied:** Bảng `public.ai_task_steps` kích hoạt RLS Server-Only, ngăn chặn rò rỉ prompt và hội thoại liên tác tử ra ngoài client.
4. **PGMQ At-Least-Once Delivery:** Sử dụng RPCs `SECURITY DEFINER` cho `ai-jobs` với cơ chế gia hạn lease VT và lưu trữ tự động vào `a_ai_jobs`.
5. **Zero Production DDL in 06G:** Quá trình chỉ đối soát mã nguồn và tài liệu; tuyệt đối không can thiệp live database.

## NEXT_PHASE
06H_CONTROLLED_PRODUCTION_MIGRATION

## NEXT_ACTION
AWAIT_HUMAN_APPROVAL
