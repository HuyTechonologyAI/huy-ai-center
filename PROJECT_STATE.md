# PROJECT STATE — HUY TECHNOLOGY AI CENTER

## PROJECT
**HUY TECHNOLOGY AI CENTER** (`huy-ai-center`)  
Trung tâm điều phối AI và quản trị hạ tầng điện toán tập trung cho Hệ sinh thái HUY TECHNOLOGY, kết nối 3 website hiện hữu (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) cùng node AI nội bộ Dell Precision M4800 (`huy-ai-node-01`).

## CURRENT_PHASE
Phase 06: Dell Dispatcher Worker (DONE — Sẵn sàng Coolify / Docker Container, 30/30 tests PASS)

## CURRENT_BRANCH
`main` (Tag: `phase-06-dell-dispatcher-worker`)

---

## COMPLETED
- [x] **Phase 01 — System Audit:** Kiểm toán READ-ONLY 3 website hiện hữu, lập tài liệu kiểm kê, kiến trúc hiện tại, rủi ro và gap analysis.
- [x] **Phase 02 — AI Center Foundation:** Monorepo, 10 Agent Skills, Contracts, Dispatcher HTTP health server, Control Center tinh giản, CI workflow.
- [x] **Phase 03 — Supabase Control Center Schema:** SQL Migrations cho Identity, Billing, AI Tasks, Registry, GitHub Radar, Nodes, Storage và Postgres Native Queues.
- [x] **Phase 04 — AI Task API Contract:** 5 Endpoints API (`/tasks`, `/:id`, `/:id/cancel`, `/:id/outputs`, `/history`), Idempotency key, Standard error model, Mock Worker tests (24/24 tests PASS).
- [x] **Phase 05 — Control Center Web Application:** Dashboard, Teacher AI form chuẩn CV 5512, Job UI theo dõi 4 trạng thái, các màn hình Projects, Files, Credits, Account (14/14 routes Next.js compile thành công).
- [x] **Phase 06 — Dell Dispatcher Worker:**
  - **Adapter Architecture:** `MockAdapter` sinh giáo án CV 5512, slide, trắc nghiệm 4 mức độ, báo cáo thuế; cấu hình `AI_PROVIDER_MODE=mock` (hỗ trợ chuyển đổi sang `langflow`, `ollama`, `litellm`).
  - **Task Router & Result Handler:** Điều tuyến theo loại tác vụ, tự động fallback to mock khi dịch vụ ngoài offline; cập nhật `ai_outputs` và trạng thái `completed`/`failed` trên Supabase.
  - **Queue Poller & Lease Renewal:** Claim atomic (`FOR UPDATE SKIP LOCKED`), tự động gia hạn lease khi đang chạy tác vụ nặng, retry transient errors, graceful shutdown.
  - **Node Heartbeat:** Cập nhật định kỳ vào bảng `nodes` và `node_heartbeats` (CPU, RAM, tải).
  - **Production Docker & Coolify:** Multi-stage Dockerfile (`node:22-alpine`, non-root user `node`, dumb-init, healthcheck), tài liệu hướng dẫn trực quan [docs/COOLIFY_DEPLOYMENT.md](docs/COOLIFY_DEPLOYMENT.md).

## IN_PROGRESS
- Không có (Phase 06 đã hoàn thành trọn vẹn).

## PENDING
- [ ] Review & Human Approval cho Phase 06.
- [ ] Triển khai thực tế trên máy chủ Dell Precision M4800 (khi người dùng chuẩn bị xong máy vật lý).
- [ ] Tích hợp Client SDK Helper vào 3 website vệ tinh hiện hữu.

---

## DATABASE_STATE
- **Production Supabase của 3 Website:** 100% nguyên vẹn (Zero-Touch).
- **AI Task Queue Migrations:** Sẵn sàng cho Staging/Dev, lưu vết tại `supabase/migrations/` (5 tệp migration).

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
1. **Configurable Provider Mode:** Sử dụng `AI_PROVIDER_MODE=mock` giúp hệ thống hoàn toàn chạy được độc lập (offline-ready) mà không cần chờ phần cứng Dell hay dịch vụ Langflow/Ollama thật online.
2. **Atomic Claim & Lease Renewal:** Đảm bảo không xảy ra race condition khi nhiều worker cùng poll và tránh việc tác vụ nặng bị coi là treo (timeout).
3. **Coolify-First Deployment:** Cung cấp tài liệu chi tiết [docs/COOLIFY_DEPLOYMENT.md](docs/COOLIFY_DEPLOYMENT.md) giúp người không biết lập trình cũng có thể tự cài đặt trên Dell M4800 qua giao diện Web.

## NEXT_ACTION
Báo cáo bàn giao Phase 06 theo đúng Rule 12 và dừng lại chờ chỉ thị tiếp theo từ người dùng.
