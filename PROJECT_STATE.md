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
Authoritative Patch V1.1 Reconciled (Phases 01 → 06 Verified)

## CURRENT_BRANCH
`feat/master-architecture-v1.1-cost-optimized`

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
- Dell Precision M4800 (`huy-ai-node-01` On-Premises, chi phí phần cứng tự sở hữu)
- Coolify (Self-hosted trên Dell M4800 - Miễn phí)
- Langflow (Self-hosted trên Dell M4800 - Miễn phí)
- n8n Internal (Self-hosted trên Dell M4800 - Miễn phí)
- Ollama (Self-hosted trên Dell M4800 - Miễn phí)
- Cloudflare Tunnel (Miễn phí)

### Estimated recurring infrastructure cost:
- $0.00 – $15.00 USD / tháng (Chủ yếu từ Gemini API pay-as-you-go khi có lưu lượng thực).
- Biên độ an toàn tối đa: <= $30.00 USD / tháng.

### New cost introduced in current phase:
- $0.00 USD (Không phát sinh bất kỳ chi phí mới nào).

### Budget status:
WITHIN_BUDGET

---

## COMPLETED
- [x] **Master Architecture Patch V1.1:**
  - Kích hoạt `.agents/skills/11-cost-guard/SKILL.md` và `.agents/skills/12-infrastructure-budget-guard/SKILL.md`.
  - Thiết lập bảng quản trị chi phí `docs/INFRASTRUCTURE_COSTS.md`.
  - Ban hành `docs/architecture/ADR-001-supabase-control-center.md` (Hủy bỏ `huy-ai-center-prod`, chọn mở rộng `HuyAI` Singapore).
  - Ban hành `docs/architecture/ADR-002-cost-optimized-v1.md` (Hoãn lại Redis, LiteLLM, OpenHands, GPU Cloud, VPS mới).
- [x] **Phase 01 — System Audit:** Kiểm toán READ-ONLY 3 website hiện hữu, lập tài liệu kiểm kê, kiến trúc hiện tại, rủi ro và gap analysis.
- [x] **Phase 02 — AI Center Foundation:** Monorepo, 12 Agent Skills, Contracts, Dispatcher HTTP health server, Control Center tinh giản, CI workflow.
- [x] **Phase 03 — Supabase Control Center Schema:** SQL Migrations cho Identity, Billing, AI Tasks, Registry, GitHub Radar, Nodes, Storage và Postgres Native Queues (Zero-Redis).
- [x] **Phase 04 — AI Task API Contract:** 5 Endpoints API (`/tasks`, `/:id`, `/:id/cancel`, `/:id/outputs`, `/history`), Idempotency key, Standard error model, Mock Worker tests (24/24 tests PASS).
- [x] **Phase 05 — Control Center Web Application:** Dashboard, Teacher AI form chuẩn CV 5512, Job UI theo dõi 4 trạng thái, các màn hình Projects, Files, Credits, Account (14/14 routes Next.js compile thành công).
- [x] **Phase 06 — Dell Dispatcher Worker:**
  - `MockAdapter` sinh giáo án CV 5512, slide, trắc nghiệm 4 mức độ, báo cáo thuế; cấu hình `AI_PROVIDER_MODE=mock`.
  - Task Router & Result Handler, Queue Poller & Lease Renewal, Node Heartbeat.
  - Production Dockerfile (Alpine, non-root, dumb-init, healthcheck) và hướng dẫn `docs/COOLIFY_DEPLOYMENT.md`.

## IN_PROGRESS
- Không có (Toàn bộ điều chỉnh V1.1 đã được đồng bộ).

## PENDING
- [ ] Review & Human Approval cho Master Architecture V1.1 Patch.
- [ ] Merge branch `feat/master-architecture-v1.1-cost-optimized` vào `main`.
- [ ] Tiến hành bước tiếp theo theo định hướng của Lead Architect / Sponsor.

---

## DATABASE_STATE
- **Production Supabase của 3 Website:** 100% nguyên vẹn (Zero-Touch).
- **HuyAI Singapore Control Center Migrations:** Sẵn sàng cho Staging/Dev, lưu vết tại `supabase/migrations/` (5 tệp migration, sử dụng Postgres Native Queues thay cho Redis).

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
1. **Existing HuyAI Consolidation:** Hủy dự án mới `huy-ai-center-prod`, mở rộng dự án `HuyAI` Singapore để giảm chi phí và tránh trùng lặp auth/data.
2. **Cost-Optimized V1:** Hoãn lại Redis, LiteLLM, OpenHands, GPU Cloud; duy trì ngân sách đám mây <= $30 USD/tháng.
3. **Dell Precision M4800 Role:** Nút tính toán nội bộ cho điều phối, hàng đợi, tự động hóa, tác vụ AI nhẹ; không ép chạy mô hình nặng cục bộ.

## NEXT_ACTION
Báo cáo hoàn thành tích hợp Master Architecture V1.1 Patch cho Lead Architect theo Rule 12.
