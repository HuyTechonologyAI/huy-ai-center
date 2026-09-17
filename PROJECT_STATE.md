# PROJECT STATE — HUY TECHNOLOGY AI CENTER

## PROJECT
**HUY TECHNOLOGY AI CENTER** (`huy-ai-center`)  
Trung tâm điều phối AI và quản trị hạ tầng điện toán tập trung cho Hệ sinh thái HUY TECHNOLOGY, kết nối 3 website hiện hữu (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) cùng node AI nội bộ Dell Precision M4800 (`huy-ai-node-01`).

## CURRENT_PHASE
Phase 1: Foundation Setup & Architecture Baseline (DONE)

## CURRENT_BRANCH
`feat/foundation-setup`

---

## COMPLETED
- [x] Khảo sát hiện trạng hệ sinh thái (3 website production, cấu trúc thư mục, môi trường runtime).
- [x] Lập Implementation Plan chi tiết cho Phase 1 và được phê duyệt.
- [x] Khởi tạo cấu trúc repository trung tâm `huy-ai-center` (Git repo initialized).
- [x] Thiết lập `.gitignore` an toàn tuyệt đối chống lộ lọt secret (PASS).
- [x] Thiết lập `.env.example` chuẩn hóa toàn bộ biến môi trường cho Supabase, Worker, Dell node và các AI service.
- [x] Thiết lập 10 workspace Agent Skills tại `.agents/skills/` (chuẩn YAML frontmatter và phân quyền rõ ràng).
- [x] Thiết lập cấu trúc Monorepo (`package.json`, `tsconfig.json`, `apps/*`, `packages/*`).
- [x] Xây dựng package `@huy-ai/contracts` (định nghĩa TypeScript types & Zod schemas cho AI Task Queue, Worker nodes, Adapters).
- [x] Xây dựng package `@huy-ai/config` (Zod environment validator chống cấu hình lỗi hoặc thiếu secret).
- [x] Xây dựng package `@huy-ai/shared` (Logger đa cấp độ và bộ điều phối Exponential Backoff Retry).
- [x] Định nghĩa Supabase SQL Migration độc lập cho Task Queue (`supabase/migrations/20260917000001_create_ai_task_queue.sql`, bảng `ai_tasks`, `ai_worker_nodes`, `ai_task_logs`, thủ tục `claim_ai_task`, RLS).
- [x] Khởi tạo Dispatcher Worker Daemon (`apps/dispatcher`) tích hợp Adapter Pattern (Ollama, LiteLLM, Langflow, n8n), Heartbeat manager và Queue Poller.
- [x] Khởi tạo Control Center Web Dashboard (`apps/control-center`) bằng Next.js App Router và API endpoints `/api/tasks`.
- [x] Cấu hình Docker cho Dell M4800 (`docker/docker-compose.worker.yml` và `docker/Dockerfile.dispatcher`).
- [x] Xây dựng kịch bản tự động hóa an toàn (`scripts/verify-safety.ps1`).
- [x] Kiểm thử toàn diện: Secret scan (0 phát hiện), Typecheck toàn workspace (100% PASS), Unit tests (100% PASS).

## IN_PROGRESS
- Không có (Phase 1 đã hoàn tất đầy đủ).

## PENDING
- [ ] Review & Merge branch `feat/foundation-setup` vào `main`.
- [ ] Phase 2: Triển khai Supabase Task Queue Migration lên môi trường Staging/Dev và kiểm tra Realtime Subscriptions.
- [ ] Phase 3: Hoàn thiện Worker Adapter E2E Testing với các mock server AI service.
- [ ] Phase 4: Hoàn thiện UI Control Center Dashboard (Telemetry biểu đồ trực quan, queue inspection).
- [ ] Phase 5: Soạn thảo Runbook cài đặt chi tiết cho Dell Precision M4800 (Ubuntu 24.04, Coolify, Docker Compose) và kết nối thử nghiệm.

---

## DATABASE_STATE
- **Production Supabase (Hiện tại):** 100% nguyên vẹn, không can thiệp.
- **AI Task Queue Schema:** Đã tạo bản migration SQL chuẩn `20260917000001_create_ai_task_queue.sql` gồm:
  - Bảng `ai_worker_nodes`: Đăng ký worker và telemetry tài nguyên.
  - Bảng `ai_tasks`: Hàng đợi tác vụ (`queued` → `claimed` → `running` → `completed` / `failed` / `timeout`).
  - Bảng `ai_task_logs`: Lịch sử chi tiết từng bước.
  - Hàm `claim_ai_task`: Claim tác vụ atomic chống xung đột race condition (`FOR UPDATE SKIP LOCKED`).
  - Row Level Security (RLS) được kích hoạt và cấu hình chính sách bảo vệ.

## API_STATE
- Package `@huy-ai/contracts` đã biên dịch thành công:
  - Types & Zod Schemas cho Task, Worker Node, Heartbeat, Adapters.
  - Route Handlers `/api/tasks` (POST: tạo task, GET: tra cứu trạng thái) trên Control Center.

## FRONTEND_STATE
- `apps/control-center`: Đã khởi tạo hoàn chỉnh giao diện Dashboard theo tông màu tối chuyên nghiệp, hiển thị trạng thái của 3 website, trạng thái máy chủ Dell M4800 và tổng quan hàng đợi AI. Typecheck 0 lỗi.

## WORKER_STATE
- `apps/dispatcher`: Đã hoàn thiện mã nguồn TypeScript Worker Daemon gồm 4 AI service adapter (Ollama, LiteLLM, Langflow, n8n), heartbeat định kỳ và queue poller. Typecheck 0 lỗi.

---

## TEST_STATUS
- **Git & Secret Hygiene:** PASS (0 file .env bị theo dõi, 0 secret/token bị hard-code).
- **TypeScript Compile:** PASS (Toàn bộ 5 workspace packages và apps biên dịch 0 lỗi).
- **Unit Tests:** PASS (6/6 tests chạy thành công: schema validation, contract types, retry exponential backoff).
- **Trạng thái:** PASS (100% Passed).

## KNOWN_ISSUES
- Không có.

## DECISIONS
1. **Decoupled Architecture:** Tách rời hoàn toàn giao tiếp giữa Website và máy chủ Dell M4800 thông qua Supabase Task Queue. Website không bao giờ crash nếu máy Dell tắt.
2. **Strict Secret Hygiene:** Tuyệt đối không lưu secret/key vào git. Mọi kết nối đều nạp qua biến môi trường.
3. **Monorepo Structure:** Sử dụng npm workspaces chuẩn, tái sử dụng `@huy-ai/contracts` giữa frontend và worker.

## NEXT_ACTION
Bàn giao báo cáo Phase 1 cho người dùng và chuẩn bị cho Phase 2 (Kiểm thử hàng đợi trên Staging/Dev).
