# PROJECT STATE — HUY TECHNOLOGY AI CENTER

## PROJECT
**HUY TECHNOLOGY AI CENTER** (`huy-ai-center`)  
Trung tâm điều phối AI và quản lý hạ tầng cho hệ sinh thái AI gồm 3 website hiện hữu (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) cùng node AI nội bộ Dell Precision M4800 (`huy-ai-node-01`).

## CURRENT_PHASE
Phase 1: Foundation Setup & Architecture Baseline (IN_PROGRESS)

## CURRENT_BRANCH
`feat/foundation-setup`

---

## COMPLETED
- [x] Khảo sát hiện trạng hệ sinh thái (3 website production, cấu trúc thư mục, môi trường runtime).
- [x] Lập Implementation Plan chi tiết cho Phase 1 và được phê duyệt.
- [x] Khởi tạo cấu trúc repository trung tâm `huy-ai-center`.
- [x] Thiết lập `.gitignore` an toàn tuyệt đối chống lộ lọt secret.
- [x] Thiết lập `.env.example` chuẩn hóa toàn bộ biến môi trường cho Supabase, Worker, Dell node và các AI service.

## IN_PROGRESS
- [ ] Thiết lập 10 workspace Agent Skills tại `.agents/skills/`.
- [ ] Thiết lập cấu trúc Monorepo (`package.json`, `tsconfig.json`, `apps/`, `packages/`).
- [ ] Định nghĩa `packages/contracts` (kiểu dữ liệu và Zod schemas cho AI Task Queue).
- [ ] Định nghĩa Supabase SQL Migration độc lập cho Task Queue (`ai_tasks`, `ai_worker_nodes`, `ai_task_logs`).
- [ ] Khởi tạo Skeleton cho Dispatcher Worker (`apps/dispatcher`) và Control Center (`apps/control-center`).
- [ ] Cấu hình Docker cho Dell M4800 (`docker/docker-compose.worker.yml`).
- [ ] Kiểm thử tự động (Typecheck, Lint, Tests, Secret Audit).

## PENDING
- [ ] Merge `feat/foundation-setup` vào `main` sau khi kiểm tra hoàn tất.
- [ ] Phase 2: Supabase Task Queue Migration Staging & Real-time Subscriptions.
- [ ] Phase 3: Dispatcher Core Engine & Local Adapters (Ollama, LiteLLM, Langflow, n8n).
- [ ] Phase 4: Control Center Dashboard (Monitor, Metrics, Queue Management).
- [ ] Phase 5: Dell Precision M4800 Onboarding Runbook & Production Rollout.

---

## DATABASE_STATE
- **Production Supabase:** Giữ nguyên trạng 100%, không can thiệp.
- **AI Task Queue Schema:** Đã soạn thảo migration `20260917000001_create_ai_task_queue.sql` gồm các bảng mới độc lập (`ai_tasks`, `ai_worker_nodes`, `ai_task_logs`), sẵn sàng cho môi trường Staging/Dev.

## API_STATE
- Định nghĩa Contracts chuẩn trong `packages/contracts`:
  - `TaskStatus`: `queued` | `claimed` | `running` | `completed` | `failed` | `timeout`
  - `TaskType`: `llm_inference` | `rag_query` | `workflow_automation` | `model_training`
  - `TaskPriority`: `low` | `normal` | `high` | `urgent`

## FRONTEND_STATE
- `apps/control-center`: Khởi tạo kiến trúc Next.js App Router + Tailwind CSS, chưa deploy.

## WORKER_STATE
- `apps/dispatcher`: Khởi tạo kiến trúc Node.js/TypeScript Worker với Adapter Pattern.
- Dell M4800 (`huy-ai-node-01`): Đang ở trạng thái chuẩn bị phần cứng, hệ thống hoạt động ở chế độ Decoupled (các task vào hàng đợi `queued` chờ worker claim).

---

## TEST_STATUS
- Khởi tạo suite kiểm thử đơn vị cho contracts validation và adapter interface.

## KNOWN_ISSUES
- Chưa có issue nào.

## DECISIONS
1. **Decoupling Dell Server:** Web không phụ thuộc trạng thái sống/chết của Dell M4800. Khi Dell offline, task nằm ở `queued`. Khi online, worker tự claim xử lý.
2. **Zero-Touch Production:** Không sửa đổi, không migration phá hủy trên bất kỳ DB nào của 3 website hiện hữu.
3. **Monorepo Architecture:** Sử dụng npm workspaces chuẩn cho `apps/*` và `packages/*` để chia sẻ code contracts mượt mà và an toàn.

## NEXT_ACTION
Hoàn tất việc tạo 10 Agent Skills và các package lõi, sau đó thực thi suite kiểm thử.
