# PROJECT STATE — HUY TECHNOLOGY AI CENTER

## PROJECT
**HUY TECHNOLOGY AI CENTER** (`huy-ai-center`)  
Trung tâm điều phối AI và quản trị hạ tầng điện toán tập trung cho Hệ sinh thái HUY TECHNOLOGY, kết nối 3 website hiện hữu (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) cùng node AI nội bộ Dell Precision M4800 (`huy-ai-node-01`).

## CURRENT_PHASE
Phase 04: AI Task API Contract (DONE — Sẵn sàng tích hợp cho 3 Website, Mock Worker tested)

## CURRENT_BRANCH
`feat/ai-task-contract`

---

## COMPLETED
- [x] **Phase 01 — System Audit:** Kiểm toán READ-ONLY 3 website hiện hữu, lập tài liệu kiểm kê, kiến trúc hiện tại, rủi ro và gap analysis.
- [x] **Phase 02 — AI Center Foundation:** Monorepo, 10 Agent Skills, Contracts, Dispatcher HTTP health server, Control Center tinh giản, CI workflow.
- [x] **Phase 03 — Supabase Control Center Schema:** SQL Migrations cho Identity, Billing, AI Tasks, Registry, GitHub Radar, Nodes, Storage và Postgres Native Queues.
- [x] **Phase 04 — AI Task API Contract:**
  - **Hệ thống 5 Endpoints Chuẩn hóa:**
    - `POST /api/ai/tasks`: Tiếp nhận task (`source_app`, `task_type`, `input`, `options`) và trả về `{"task_id": "...", "status": "queued"}`.
    - `GET /api/ai/tasks/:id`: Tra cứu trạng thái và tiến độ xử lý.
    - `POST /api/ai/tasks/:id/cancel`: Hủy tác vụ đang xếp hàng.
    - `GET /api/ai/tasks/:id/outputs`: Trích xuất kết quả đầu ra có cấu trúc (`AIOutput`).
    - `GET /api/ai/history`: Tra cứu lịch sử tác vụ có phân trang và bộ lọc.
  - **Zero-Trust Validation:** Xác thực Authentication & Authorization, kiểm tra hạn mức tín dụng (Credits/Quota check), giới hạn kích thước dữ liệu (Max 1MB).
  - **Cơ chế Idempotency:** Header `Idempotency-Key` ngăn chặn tạo trùng lặp job khi trình duyệt hoặc client tự động thử lại.
  - **Chuẩn hóa Error Model:** Thống nhất định dạng lỗi gồm `code`, `message`, `retryable`, `request_id`.
  - **Tài liệu Kỹ thuật Chuẩn mực:**
    - [docs/API_CONTRACT.md](docs/API_CONTRACT.md)
    - [docs/ERROR_MODEL.md](docs/ERROR_MODEL.md)
  - **Mock Worker Test Suite:**
    - Hoàn thành suite kiểm thử `tests/ai-task-api.test.ts` mô phỏng đầy đủ chu trình vòng đời tác vụ (queued -> claimed -> completed / cancelled) mà không cần máy chủ Dell thật (6/6 tests PASS).

## IN_PROGRESS
- Không có (Phase 04 đã hoàn thành toàn bộ yêu cầu).

## PENDING
- [ ] Review & Human Approval cho toàn bộ Phase 04.
- [ ] Review & Merge branch `feat/ai-task-contract` vào `main`.
- [ ] Phase 05: Client SDK Integration Helper cho 3 website (hoặc Control Center Dashboard UI hoàn thiện).
- [ ] Phase 06: Dell Precision M4800 Deployment Runbook & Physical Node Onboarding.

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
- Package `@huy-ai/contracts`: Mở rộng thêm `CreateTaskRequestSchema`, `CreateTaskResponseSchema`, `StandardErrorSchema`, `TaskOutputsResponseSchema`, `TaskHistoryQuerySchema`.

## FRONTEND_STATE
- `apps/control-center`: Next.js 15, tích hợp đầy đủ các API route handlers, typecheck 0 lỗi.

## WORKER_STATE
- `apps/dispatcher`: Sẵn sàng kết nối với Task Queue, có máy chủ HTTP Health check port 8080. Đã kiểm thử thành công qua Mock Worker logic.

---

## TEST_STATUS
- **Contracts Unit Tests:** PASS (14/14 tests).
- **API Logic & Mock Worker Tests:** PASS (6/6 tests).
- **Dispatcher Health Tests:** PASS (1/1 test).
- **Shared Backoff Utility Tests:** PASS (3/3 tests).
- **Tổng cộng:** 24/24 tests PASS (100% Passed).

## KNOWN_ISSUES
- Không có.

## DECISIONS
1. **Next.js Server Route Handlers Choice:** Triển khai API trực tiếp trên Next.js App Router trong `apps/control-center` để tận dụng hạ tầng Vercel Serverless sẵn có, code chia sẻ type-safe với `@huy-ai/contracts` và không phát sinh thêm chi phí vận hành dịch vụ ngoài.
2. **Strict Idempotency Mechanism:** Lưu vết Idempotency Key trong bộ nhớ đệm (TTL 10 phút) để bảo đảm việc người dùng bấm gửi nhiều lần hoặc mạng giật không tạo ra nhiều task trùng nhau.
3. **Mock Worker Isolation:** Toàn bộ kiểm thử logic vòng đời task được thực hiện qua Mock Worker, tuyệt đối không phụ thuộc vào trạng thái vật lý của máy chủ Dell M4800.

## NEXT_ACTION
Báo cáo bàn giao Phase 04 cho người dùng và dừng lại chờ chỉ thị tiếp theo.
