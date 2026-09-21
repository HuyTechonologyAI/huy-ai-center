# PROJECT STATE — HUY AI AGENCY GROUP

## PROJECT
**HUY AI AGENCY GROUP** (`huy-ai-center`)  
Hệ điều hành Doanh nghiệp Đa Tác tử Tự trị (Autonomous Enterprise Multi-Agent Operating System) quản trị và điều phối tập trung 6 Đơn vị Kinh doanh (Business Units) trong Hệ sinh thái HUY AI: Huy Technology (`org-01-huytech`), GVCNCDSAI AI School (`org-02-aischool`), SmartTax AI (`org-03-smarttax`), Huy Tech Media (`org-04-media-tech`), GVCNCDSAI Media (`org-05-media-edu`), Huy Creative Media (`org-06-media-creative`). Kết nối hạ tầng Supabase Cloud (`HuyAI` Singapore), các website hiện hữu (`huycncdsai.io.vn`, `gvcncdsai.io.vn`, `smarttax-ai.vercel.app`) cùng node AI nội bộ Dell Precision M4800 (`huy-ai-node-01`).

## ARCHITECTURE_VERSION
2.0 (Enterprise Multi-Agent Holding Architecture — Reconciled)

## BUSINESS_MODEL
AI_AGENCY_GROUP

## ORGANIZATIONS
6_FROZEN

## ORG_01
org-01-huytech (HUY TECHNOLOGY AI GROUP — Parent Holding / Technology / Group Control — CC-01-HUYTECH)

## ORG_02
org-02-aischool (GVCNCDSAI AI SCHOOL — Education / AI School — CC-02-AISCHOOL)

## ORG_03
org-03-smarttax (SMARTTAX AI — Tax / Legal / Compliance — CC-03-SMARTTAX)

## ORG_04
org-04-media-tech (HUY TECH MEDIA — Technology / AI / Automation Media — CC-04-MEDIA-TECH)

## ORG_05
org-05-media-edu (GVCNCDSAI MEDIA — Education / Teacher / Student / STEM Media — CC-05-MEDIA-EDU)

## ORG_06
org-06-media-creative (HUY CREATIVE MEDIA — Music / Entertainment / Creative Media — CC-06-MEDIA-CREATIVE)

## DEPARTMENTS
CANONICAL_IDS_DEFINED (65 Globally Unique Department IDs across 6 BUs)

## MVP_AGENT_ROSTER
25_DEFINED_NOT_SEEDED (1 L4, 6 L3, 9 L2, 9 L1)

## AGENT_LEVELS
L4 GROUP, L3 COMPANY, L2 DEPARTMENT, L1 SPECIALIST, L0 TOOL (Higher Number = Higher Authority)

## CAPABILITY_CATALOG
DEFINED (Canonical dot-separated lowercase format, Capability != Authority)

## TOOL_PERMISSION_MODEL
DEFINED (21 Abstract permissions, 6 sensitive permissions never implicitly granted)

## MODEL_POLICY
DEFINED (MODEL_TIER_0 to MODEL_TIER_4, no agent self-elevation)

## DATA_SCOPES
DEFINED (URI pattern data://<org>/<tier>/*, no wildcard by default)

## KNOWLEDGE_SCOPES
DEFINED (URI pattern kb://<org>/<domain>/*, explicit cross-org authorization)

## DELEGATION_MATRIX
DEFINED (Strict ALLOW / DENY matrix, Single PGMQ ai-jobs queue ingress)

## COST_CENTERS
6_DEFINED (CC-01-HUYTECH to CC-06-MEDIA-CREATIVE, Budget Lock enforced)

## POLICY_DEFAULT
DENY (Zero-Trust Policy Engine Contract)

## SMARTTAX_BOUNDARY
LOGICAL_ISOLATION_STAGE_1 (Organization-scoped RLS, Department authorization, Storage isolation, Knowledge isolation)

## AGENT_CARD_V2
PROPOSED_NOT_PERSISTED (Database Mapping Deferred to Phase 06K)

## DATABASE_MULTI_ORG
NOT_MIGRATED (Zero Schema DDL in Phase 06J)

## PRODUCTION_AGENTS
0 (Clean registry; unseeded)

## AUTONOMY_MODEL
GOAL_TO_RESULT

## INTER_AGENT_PROTOCOL
HAIP/1.0

## HAIP_DATABASE_MAPPING
READY

## PUBLIC_TABLES
34 (19 Baseline Tables + 15 AI Center Tables)

## MIGRATION_HISTORY_COUNT
7 (1 Remote Baseline + 5 HAIP Core Migrations + 1 Security Hardening Migration)

## AGENT_TO_TOOL_PROTOCOL
MCP

## EXTERNAL_AGENT_PROTOCOL
A2A_ADAPTER_PLANNED

## PGMQ
ACTIVE

## QUEUE
ai-jobs (Single Durable Ingress Queue)

## QUEUE_DELIVERY
AT_LEAST_ONCE

## IDEMPOTENCY
ENFORCED

## CLIENT_INTERNAL_TRACE_ACCESS
DENIED (RLS Server-Only on `ai_task_steps`)

## DISPATCHER
NOT_DEPLOYED

## DATABASE
PRODUCTION_MIGRATED (Baseline + HAIP 10001-10006 applied)

## NODE
huy-ai-node-01 (REGISTERED / OFFLINE)

## MODEL_REGISTRY
EMPTY

## LANGFLOW
NOT_DEPLOYED

## N8N
NOT_DEPLOYED

## OLLAMA
NOT_DEPLOYED

## HUMAN_ROLE
FINAL_AND_HIGH_RISK_APPROVAL (Strictly Gated for Risk >= 3 or Budget Depletion)

## MVP_COST_TARGET
0–30 USD/month when practical (Run-rate: 0 - 15 USD/mo)

## COST_STRATEGY
Open-source first, local compute first when economical, free tier first, low-cost cloud second, premium models only when justified. Scaling permitted only against revenue/ROI.

## SUPABASE_CONTROL_CENTER
HuyAI (Singapore)

## REDIS
DISABLED

## LITELLM
DEFERRED

## OPENHANDS
DEFERRED

## UI_UX_VERSION
2.0

## UI_UX_V2_STATE
POLISHED_AND_FROZEN

## CORPORATE_V2
STAGING_VALIDATED

## FEATURE_BRANCH
REMOTE_PUSHED

## VERCEL_PREVIEW
ACTIVE

## HUMAN_VISUAL_REVIEW
LOCAL_PASS

## HUMAN_STAGING_REVIEW
PENDING

## BRAND_SYSTEM
FROZEN

## DESIGN_SYSTEM
DEFINED_AND_FROZEN

## INFORMATION_ARCHITECTURE
DEFINED_AND_FROZEN

## HOMEPAGE_V2
READY_FOR_STAGING

## CORPORATE_HOMEPAGE_V2
READY_FOR_STAGING

## ECOSYSTEM_MAP_V2
READY_FOR_STAGING

## AI_AGENCY_DIAGRAM_V2
CORRECTED_AND_FROZEN

## SECURITY_GOVERNANCE_V2
PUBLIC_HARDENED

## FOUNDER_CREDENTIALS_V2
VERIFIED_PRESERVED

## LEGACY_LEAK_CHECK
ZERO_DETECTED

## PUBLIC_ECOSYSTEM_CONTRACT
VALIDATED

## RESPONSIVE
VALIDATED (390px, 430px, 768px, 1024px, 1280px, 1366px, 1440px, 1920px)

## ACCESSIBILITY
VALIDATED (WCAG AA 98/100, Reduced Motion)

## SEO_V2
SPECIFIED

## CONTENT_MIGRATION
PLANNED

## CONTROL_CENTER_UX
HANDOFF_DEFINED

## PRODUCTION_UI
UNCHANGED

## PRODUCTION_DOMAIN
UNCHANGED

## CURRENT_PHASE
PHASE 06J-UX-C — STAGING VALIDATION

## NEXT_PHASE
06J-UX-C.1_HUMAN_STAGING_REVIEW

## CURRENT_BRANCH
`feature/06j-ux-b-corporate-v2-preview` (Remote pushed; main untouched)

---

## COST STATE

### Current recurring services:
- Vercel (Hosting 3 Website & Control Center - Plan Dependent)
- Supabase: `HuyAI` Singapore (Free tier with limits - $0.00/month)
- Cloudflare (Free tier with limits - $0.00/month)
- GitHub (Free tier with limits - $0.00/month)

### Known paid services:
- Không có dịch vụ bắt buộc trả phí cố định hàng tháng trong V2.
- Gemini API (Pay-as-you-go, dự báo $0 – $15.00/tháng theo lượng dùng thực tế).

### Free services:
- Dell Precision M4800 (`huy-ai-node-01` On-Premises, chi phí phần cứng tự sở hữu - Đã cài Coolify, Traefik, Cloudflare Tunnel, ops.huycncdsai.io.vn)
- Coolify (Self-hosted trên Dell M4800 - Miễn phí)
- Langflow (Self-hosted trên Dell M4800 - Miễn phí)
- n8n Internal (Self-hosted trên Dell M4800 - Miễn phí)
- Ollama (Self-hosted trên Dell M4800 - Miễn phí)
- Cloudflare Tunnel (Miễn phí)

### Estimated recurring infrastructure cost:
- MVP run-rate: $0.00 – $15.00 USD / tháng (Chủ yếu từ Gemini API pay-as-you-go khi có lưu lượng thực).
- Mục tiêu chi phí MVP: $0 – $30.00 USD / tháng khi khả thi; ngân sách mở rộng chỉ theo doanh thu/ROI thực tế.

### New cost introduced in current phase:
- $0.00 USD (Không phát sinh bất kỳ chi phí mới nào).

### Budget status:
WITHIN_BUDGET

---

## COMPLETED
- [x] **Phase 06J-UX-C — Staging Validation:**
  - Cam kết mã nguồn ứng viên staging `6c0fa2f` lên nhánh `feature/06j-ux-b-corporate-v2-preview` và đẩy thành công lên GitHub remote.
  - Vercel Preview Deployment tự động kích hoạt thành công: `https://edtech-ai-portfolio-azmg886h4-huytechonologyais-projects.vercel.app`.
  - Tuyến thẩm định staging: `https://edtech-ai-portfolio-azmg886h4-huytechonologyais-projects.vercel.app/v2`.
  - Kích hoạt cơ chế bảo vệ tìm kiếm `X-Robots-Tag: noindex, nofollow` trên môi trường preview.
  - Thẩm định tương thích hiển thị trên 8 độ phân giải từ 390px đến 1920px: 100% không tràn thanh cuộn ngang.
  - Kiểm thử trình duyệt kép Chromium (Chrome) và Microsoft Edge: kết xuất thành công 100%.
  - Kiểm định khả năng truy cập WCAG AA (98/100, 0 lỗi tên nhãn, 0 lỗi ảnh thiếu alt, hỗ trợ Reduced Motion).
  - Điểm số hiệu năng Lighthouse: Desktop Performance 94, Mobile Performance 88, SEO 100, LCP 1.2s, CLS 0.01, TBT 65ms.
  - Xuất trọn bộ 14 ảnh chụp màn hình kiểm định staging tại `screenshots-v2-staging/`.
  - Bảo toàn tuyệt đối: Zero Production Mutation, Zero DDL, Zero DB writes, tên miền `huycncdsai.io.vn` nguyên vẹn.
- [x] **Phase 06J-UX-B.2 — Final Polish & Launch Readiness:**
  - Cách ly hoàn toàn giao diện kế thừa: tạo `LegacyShellWrapper.tsx`, loại bỏ header cũ, thanh top hệ sinh thái, thanh dock bottom navigation di động, và footer cũ khỏi `/v2`.
  - Chuẩn hóa phân cấp Tác tử: Human Governance là tầng quản trị tối cao (không gắn số level), Level 4 là Group AI, Level 3 là Company AI, Level 2 là Department AI, Level 1 là Specialist AI, Level 0 là Tools.
  - Thắt chặt và đại chúng hóa thuật ngữ bảo mật: loại bỏ RLS Matrix, Row-Level Security, R3, R4, "100% vết kiểm toán"; thay bằng 4 trụ cột đại chúng (Phân quyền theo phạm vi dữ liệu, Giám sát con người, Quyền hạn tối thiểu, Nhật ký & khả năng truy vết).
  - Chuẩn hóa định vị thương hiệu: "Hệ sinh thái công nghệ kết nối" thay vì xưng tập đoàn đồ sộ trong văn phong đại chúng.
  - Tối ưu CTA: Primary `Tư vấn AI Automation`, Secondary `Khám phá hệ sinh thái`.
  - Khắc phục anchor scroll: bổ sung `scroll-mt-24 md:scroll-mt-28` cho toàn bộ các section ID.
  - Bảo tồn trọn vẹn thông tin Nhà sáng lập Ngô Quốc Huy (Kỹ sư Cơ khí Chế tạo ĐH SPKT TP.HCM) và 2 giải thưởng xác thực (Người thợ trẻ giỏi toàn quốc 2020 & Giải Nhất Khởi nghiệp ĐMST OCOP Đồng Nai 2020).
  - Tối ưu Bản đồ hệ sinh thái và mật độ thông tin di động.
  - Xuất trọn bộ 16 ảnh chụp màn hình kiểm định thị giác cuối cùng tại `screenshots-v2-final/`.
  - Bộ kiểm thử `tests/ui-ux-v2-final-polish.test.ts` bổ sung; toàn monorepo đạt **58/58 tests PASS 100%**.
- [x] **Phase 06J-UX-B.1 — Public Content Hardening + Human Visual Review Package:**
  - Thắt chặt nội dung công khai, phân tách rõ trạng thái Live / Beta / Dev / Planned, gỡ bỏ các tuyên bố chưa xác thực, bảo toàn thông tin Founder.
- [x] **Phase 06J-UX-B — Implementation Preview:**
  - Triển khai toàn bộ giao diện Corporate V2 trên Next.js 16 tại nhánh cục bộ `feature/06j-ux-b-corporate-v2-preview`.
- [x] **Phase 06J-UX-A — Huy AI Digital Ecosystem Corporate UX Architecture + Design System Freeze:**
  - Thiết lập trọn bộ Design Tokens máy đọc được tại `config/ui/v2/`: `design-tokens.json`, `organization-brand-tokens.json`.
  - Ban hành 17 tài liệu đặc tả UI/UX chuyên sâu tại `docs/ui-ux/`.
- [x] **Phase 06J-B — Organization + Department + Agent + Policy Reconciliation:**
  - Thiết lập trọn bộ cấu hình máy đọc được tại `config/architecture/v2/` và 10 tài liệu kiến trúc.
- [x] **Phase 06J-A.1 — Architecture Reconciliation (Canonical Freeze Correction):**
  - Chuẩn hóa 6 tổ chức chính quy, cấp bậc tác tử L4->L0.
- [x] **Phase 06J-A — Enterprise Organization Architecture Freeze (V2.0):**
  - Khởi thảo 11 tài liệu kiến trúc đặc tả doanh nghiệp tại `docs/architecture/`.
- [x] **Phase 06I — Post-Migration Security Hardening:**
  - Áp dụng migration `20260921010006_ai_center_security_hardening.sql`. Khóa quyền RPC trigger.
- [x] **Phase 06H-C — Controlled Production Database Push:**
  - Áp dụng thành công 5 migration HAIP canonical lên Supabase Production `HuyAI`.
- [x] **Phase 06H-B — Restore HAIP Migrations and Production Dry Run:**
  - Đồng bộ remote baseline migration `20260921005127_remote_schema.sql`.
- [x] **Phases 01 → 06G:** Foundation, Monorepo, Contracts, API Routes, Next.js Web Dashboard, Dell Dispatcher Worker, Database Baseline.

---

## IN_PROGRESS
- Không có (Phase 06J-UX-C đã hoàn tất 100% triển khai và thẩm định Staging; dừng lại chờ đánh giá của con người).

---

## PENDING
- [ ] Đánh giá thẩm định của con người đối với Staging Preview V2 (`docs/PHASE_06J_UX_C_STAGING_VALIDATION_REPORT.md`).
- [ ] Tiến hành Phase 06J-UX-C.1 — Human Staging Review.

---

## DATABASE_STATE
PRODUCTION_MIGRATED_STABLE

- **Bảo toàn dữ liệu 19 bảng hiện hữu:** 100% nguyên vẹn (Zero-Touch, 239 rows nguyên trạng).
- **15 Bảng AI Center Đã Di Trú:** `ai_tasks`, `ai_task_steps`, `ai_outputs`, `nodes`, `node_heartbeats`, `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`, `github_projects`, `github_reviews`, `github_versions`.
- **Hạ Tầng Hàng Đợi:** PGMQ Durable Queue `ai-jobs` đang hoạt động (0 ready messages).
- **Trạng thái Đa Tổ chức:** `DATABASE_MULTI_ORG: NOT_MIGRATED` (Zero Schema DDL).

---

## API_STATE
- Endpoints hoạt động tại `apps/control-center/src/app/api/ai/...`:
  - `POST /api/ai/tasks`
  - `GET /api/ai/tasks/:id`
  - `POST /api/ai/tasks/:id/cancel`
  - `GET /api/ai/tasks/:id/outputs`
  - `GET /api/ai/history`

---

## FRONTEND_STATE
- `apps/control-center`: Next.js 15, React 19, Tailwind CSS. Toàn bộ 14 routes tĩnh và động biên dịch thành công, typecheck 0 lỗi.
- `scratch/edtech-ai-portfolio`: Next.js 16 (Turbopack). Nhánh `feature/06j-ux-b-corporate-v2-preview`. Đã đẩy lên remote và kích hoạt Vercel Preview Deployment thành công. Toàn bộ 56 routes biên dịch thành công 100%. Đã xuất 14 ảnh chụp màn hình kiểm định staging tại `public/screenshots-v2-staging/`.

---

## WORKER_STATE
- `apps/dispatcher`: HAIP Router Architecture đã đối soát và kiểm thử đơn vị; **chưa triển khai (NOT DEPLOYED)**.

---

## TEST_STATUS
- **Contracts & HAIP Unit Tests:** PASS (25/25 tests).
- **API Logic Tests:** PASS (6/6 tests).
- **Dispatcher Tests:** PASS (7/7 tests).
- **Shared Tests:** PASS (3/3 tests).
- **Architecture V2 Consistency Tests:** PASS (7/7 tests).
- **UI/UX Design Tokens & Contracts Tests:** PASS (5/5 tests).
- **UI/UX V2 Final Polish Tests:** PASS (5/5 tests).
- **TypeScript Compile:** PASS (Toàn bộ workspaces & portfolio).
- **Tổng cộng:** 58/58 tests PASS (100% Passed).

---

## KNOWN_ISSUES
- Không có.

---

## NEXT_ACTION
AWAIT_HUMAN_STAGING_REVIEW (Dừng lại để người dùng đánh giá thẩm định trực tiếp trên Vercel Preview URL trước khi chuyển sang các giai đoạn tiếp theo).

