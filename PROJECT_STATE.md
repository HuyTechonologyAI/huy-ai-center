# PROJECT STATE — HUY TECHNOLOGY AI CENTER

## PROJECT
**HUY TECHNOLOGY AI CENTER** (`huy-ai-center`)  
Trung tâm điều phối AI và quản trị hạ tầng điện toán tập trung cho Hệ sinh thái HUY TECHNOLOGY, kết nối 3 website hiện hữu (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) cùng node AI nội bộ Dell Precision M4800 (`huy-ai-node-01`).

## CURRENT_PHASE
Phase 02: AI Center Foundation (DONE)

## CURRENT_BRANCH
`feat/ai-center-foundation`

---

## COMPLETED
- [x] **Phase 01 — System Audit:** Kiểm toán READ-ONLY toàn bộ 3 website, lập `SYSTEM_INVENTORY.md`, `CURRENT_ARCHITECTURE.md`, `RISK_REGISTER.md`, `ARCHITECTURE_GAP_ANALYSIS.md`.
- [x] **Repository Audit & Setup:** Rà soát cấu trúc hiện có của `huy-ai-center`, không overwrite bừa bãi, bảo toàn toàn vẹn mã nguồn.
- [x] **Contracts Hoàn thiện (@huy-ai/contracts):**
  - Định nghĩa đầy đủ 8 thực thể bắt buộc: `AITask`, `AITaskStep`, `AIOutput`, `Agent`, `Tool`, `Node`, `QueueMessage`, `TaskStatus`.
  - Chuẩn hóa `TaskStatus` tối thiểu: `queued`, `claimed`, `running`, `waiting_approval`, `completed`, `failed`, `cancelled`.
  - Viết suite kiểm thử xác thực Zod schemas (8/8 tests PASS).
- [x] **Control Center Tinh giản (@huy-ai/control-center):**
  - Tối giản dependencies (chỉ giữ Next.js 15, React 19, Tailwind CSS, Supabase Client).
  - API endpoint `/api/tasks` xác thực schema chặt chẽ.
  - Typecheck đạt 0 lỗi.
- [x] **Dispatcher Worker Độc lập (@huy-ai/dispatcher):**
  - Đóng gói chuẩn 12-Factor App, structured logging, graceful shutdown, exponential backoff retry.
  - Tích hợp máy chủ HTTP Health Check độc lập (`HealthServer`) phục vụ endpoint `/health` và `/ready` (port 8080).
  - Không hard-code endpoint, toàn bộ kết nối nạp qua `@huy-ai/config`.
  - Typecheck đạt 0 lỗi; Unit test cho HealthServer đạt 100% PASS.
- [x] **Continuous Integration (.github/workflows/ci.yml):**
  - Tự động chạy `lint`, `typecheck`, `test`, `build` khi có PR hoặc push.
  - Tuyệt đối không tự động deploy production.
- [x] **Tài liệu Kỹ thuật Chuẩn mực:**
  - Hoàn thiện `docs/LOCAL_DEVELOPMENT.md`.
  - Hoàn thiện `docs/DEPLOYMENT_MODEL.md`.
  - Hoàn thiện `docs/ENVIRONMENT_VARIABLES.md`.
  - Cập nhật `README.md`.
- [x] **Kiểm tra Toàn vẹn & An toàn:**
  - `scripts/verify-safety.ps1` chạy đạt 100% PASS (0 secret lộ, 0 lỗi TypeScript, 100% tests thành công).

## IN_PROGRESS
- Không có (Phase 02 đã hoàn tất toàn bộ yêu cầu).

## PENDING
- [ ] Review & Merge branch `feat/ai-center-foundation` vào `main`.
- [ ] Phase 03: Supabase Staging Migration & Realtime Task Subscriptions.
- [ ] Phase 04: Control Center Queue Management & Telemetry UI.
- [ ] Phase 05: Dell Precision M4800 Integration & Local AI Service Deployment (Ollama, LiteLLM, Langflow, n8n).

---

## DATABASE_STATE
- **Production Supabase của 3 Website:** 100% nguyên vẹn (Zero-Touch).
- **AI Task Queue Migration (`20260917000001_create_ai_task_queue.sql`):**
  - Bảng `ai_tasks` (hỗ trợ đầy đủ các trạng thái và steps).
  - Bảng `ai_worker_nodes` (quản lý node Dell M4800 và worker cloud).
  - Bảng `ai_task_logs` (nhật ký thực thi).
  - Hàm `claim_ai_task()` (khóa hàng chống tranh chấp bằng `FOR UPDATE SKIP LOCKED`).
  - Row Level Security (RLS) policies đầy đủ.

## API_STATE
- Package `@huy-ai/contracts`:
  - `AITask`, `AITaskStep`, `AIOutput`, `Agent`, `Tool`, `Node`, `QueueMessage`, `TaskStatus`.
- Route Handlers trong Control Center:
  - `POST /api/tasks`: Tạo tác vụ mới.
  - `GET /api/tasks?id=...`: Tra cứu trạng thái và kết quả tác vụ.
- Dispatcher Health HTTP Server:
  - `GET /health`: Kiểm tra trạng thái máy chủ worker daemon.
  - `GET /ready`: Kiểm tra tính sẵn sàng tiếp nhận tác vụ.

## FRONTEND_STATE
- `apps/control-center`: Next.js App Router tinh gọn, tối giản dependencies, typecheck 0 lỗi.

## WORKER_STATE
- `apps/dispatcher`: Độc lập, có HTTP Health server (port 8080), 4 AI adapters (Ollama, LiteLLM, Langflow, n8n), heartbeat định kỳ. Typecheck 0 lỗi, tests pass.

---

## TEST_STATUS
- **Safety & Secret Scan:** PASS (0 file .env bị commit, 0 secret/token bị hard-code).
- **TypeScript Compile Check:** PASS (Toàn bộ 5 workspace packages/apps đạt 0 lỗi).
- **Contracts Unit Tests:** PASS (8/8 tests passed).
- **Dispatcher Health Tests:** PASS (1/1 test passed).
- **Shared Utility Tests:** PASS (3/3 tests passed).
- **Tổng cộng:** 12/12 tests PASS.

## KNOWN_ISSUES
- Không có.

## DECISIONS
1. **Minimal Dependencies for Control Center:** Loại bỏ các thư viện UI phụ thuộc không cần thiết (`lucide-react`, v.v.), chỉ giữ Next.js, React, Tailwind và Supabase Client để bảo đảm ứng dụng nhẹ và ổn định lâu dài.
2. **Native HTTP Health Server for Dispatcher:** Sử dụng trực tiếp module `node:http` có sẵn của Node.js để tạo máy chủ healthcheck, tránh phải cài đặt thêm Express hay Fastify cho worker daemon.
3. **TaskStatus Standardization:** Hỗ trợ đầy đủ 7 trạng thái chuẩn: `queued`, `claimed`, `running`, `waiting_approval`, `completed`, `failed`, `cancelled`.
4. **CI-Only Guardrail:** Quy định chặt chẽ trong workflow GitHub Actions chỉ kiểm thử mã nguồn, không tự động deploy production.

## NEXT_ACTION
Báo cáo kết quả hoàn thành Phase 02 cho người dùng và dừng lại chờ chỉ thị tiếp theo.
