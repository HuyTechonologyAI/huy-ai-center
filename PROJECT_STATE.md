# PROJECT STATE — HUY TECHNOLOGY AI CENTER

## PROJECT
**HUY TECHNOLOGY AI CENTER** (`huy-ai-center`)  
Trung tâm điều phối AI và quản trị hạ tầng điện toán tập trung cho Hệ sinh thái HUY TECHNOLOGY, kết nối 3 website hiện hữu (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) cùng node AI nội bộ Dell Precision M4800 (`huy-ai-node-01`).

## CURRENT_PHASE
Phase 05: Control Center Web Application (DONE — Sẵn sàng Vercel Preview / Staging, 14 Routes biên dịch thành công)

## CURRENT_BRANCH
`main` (Tag: `phase-05-control-center-web`)

---

## COMPLETED
- [x] **Phase 01 — System Audit:** Kiểm toán READ-ONLY 3 website hiện hữu, lập tài liệu kiểm kê, kiến trúc hiện tại, rủi ro và gap analysis.
- [x] **Phase 02 — AI Center Foundation:** Monorepo, 10 Agent Skills, Contracts, Dispatcher HTTP health server, Control Center tinh giản, CI workflow.
- [x] **Phase 03 — Supabase Control Center Schema:** SQL Migrations cho Identity, Billing, AI Tasks, Registry, GitHub Radar, Nodes, Storage và Postgres Native Queues.
- [x] **Phase 04 — AI Task API Contract:** 5 Endpoints API (`/tasks`, `/:id`, `/:id/cancel`, `/:id/outputs`, `/history`), Idempotency key, Standard error model, Mock Worker tests (24/24 tests PASS).
- [x] **Phase 05 — Control Center Web Application:**
  - **Kiến trúc AppLayout:** Sidebar điều hướng 7 mục, Header hiển thị số dư ví Credits và avatar, thiết kế responsive trên di động.
  - **Ứng Dụng Teacher AI Suite (`/apps/teacher-ai`):** Soạn giáo án CV 5512, sinh Slide, Quiz, Mindmap, Phiếu học tập, Video script với form chuẩn sư phạm.
  - **Job UI (`/tasks/[id]`):** Theo dõi tiến độ thời gian thực qua 4 trạng thái (`Queued`, `Processing`, `Completed`, `Failed`), thông báo thân thiện khi máy chủ Dell offline, giả lập thử nghiệm và hiển thị 4 tab kết quả.
  - **Bộ Màn Hình Vệ Tinh:** Dashboard (`/`), Danh mục AI Apps (`/apps`), Lịch sử tác vụ (`/history`), Dự án (`/projects`), Kho tệp lưu trữ (`/files`), Hạn mức ví Credits (`/credits`), Hồ sơ quản trị & API Keys (`/account`).
  - **Biên dịch Sản xuất:** Next.js build 14/14 routes thành công 100%.

## IN_PROGRESS
- Không có (Phase 05 đã hoàn thành trọn vẹn).

## PENDING
- [ ] Review & Human Approval cho Phase 05.
- [ ] Triển khai bản Vercel Preview / Staging cho `app.huycncdsai.io.vn` (khi người dùng cung cấp Vercel token/quyền).
- [ ] Phase 06: Client SDK Integration Helper cho 3 website hoặc Dell M4800 Deployment & Dispatcher Runbook.

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
- `apps/dispatcher`: Sẵn sàng kết nối với Task Queue, có máy chủ HTTP Health check port 8080. Đã kiểm thử thành công qua Mock Worker logic.

---

## TEST_STATUS
- **Contracts Unit Tests:** PASS (14/14 tests).
- **API Logic & Mock Worker Tests:** PASS (6/6 tests).
- **Dispatcher Health Tests:** PASS (1/1 test).
- **Shared Backoff Utility Tests:** PASS (3/3 tests).
- **TypeScript Compile:** PASS (5/5 workspaces).
- **Next.js Production Build:** PASS (14/14 routes).
- **Tổng cộng:** 100% Passed.

## KNOWN_ISSUES
- Không có.

## DECISIONS
1. **Giao diện Tiếng Việt Ưu tiên Sư phạm:** Thiết kế giao diện thân thiện, chuẩn mực theo ngôn ngữ ngành giáo dục và tài chính tại Việt Nam.
2. **Offline-Tolerant Banner:** Khi máy chủ Dell M4800 chưa online, hệ thống hiển thị thông báo tiến trình đang xếp hàng an tâm, không báo lỗi giả hay gây hoang mang cho người dùng.
3. **Mock Preview Switcher:** Tích hợp nút mô phỏng tiến độ ngay trong Job UI giúp kiểm thử toàn bộ trải nghiệm người dùng trước khi kết nối phần cứng thật.

## NEXT_ACTION
Báo cáo bàn giao Phase 05 theo đúng Rule 12 và dừng lại chờ chỉ thị tiếp theo từ người dùng.
