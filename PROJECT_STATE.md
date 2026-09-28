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
SPECIFIED_V2 (Formal JSON Schema 2.0 + Model B Pointer + SHA-256 Hash Verification designed in Phase 06K-A)

## DATABASE_MULTI_ORG
DRAFT_AND_DRY_RUN_VALIDATED (Phase 06K-B Multi-Org Migration Draft + Production-Parity Isolated Dry Run Complete: 5 migration drafts created, 34/34 security tests PASS, Rollback restored baseline 34 tables, Reapply PASS, Zero production mutations)

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
DEPLOYED_QUEUE_GATED_07B (Node01 user service active on 127.0.0.1:18081; production queue gate CLOSED pending separate 07C Human Gate)

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
PASS

## PRODUCTION_APPROVAL
GRANTED_FOR_NEXT_PHASE_ONLY

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
AI-DEV-BRIDGE-B — Autonomous backlog bootstrap on feature branch; implementation and acceptance verification in progress. Phase 06K-B/06K-B.1 completed and merged; production 06K-C has not been applied.

## NEXT_PHASE
06K-C readiness package (read-only), followed by an R4 owner gate before any production apply.

## CURRENT_BRANCH
`feature/ai-dev-bridge-b-autonomous-backlog` (coordination); implementation in `agent-task/bridge-b-autonomous-backlog`.

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
- [x] 2026-09-27 `ai-workforce-plan` / ORG-HR-02 PARTIAL (definitions complete; full bridge verification constrained by task scope) on `agent-task/ai-workforce-plan`: 12/12 role families, 36 competency scores (0 verified), 36 probation benchmarks, five hiring phases; governance and assurance precede delivery/domain/operations. Approved roles.json, workforce_schema.json and tool_assignments.json complete the [artifact registry](docs/organization/workforce_plan.md); frozen permission/probation contracts and context requirements validated. All roles UNVERIFIED, zero effective permissions, runtime disabled; no provider qualification claimed.
- [x] ORG-HR-02 verification: Python workforce discovery 49/49 PASS; workspace TypeScript checks PASS; five scope-safe bridge regression files PASS via `node --import tsx --test`. Full test:bridge NOT RUN: fixtures write forbidden .artifacts/.env paths and create commits. Cumulative HEAD diff plus untracked artifacts: 200 added/deleted lines; largest new file 40 lines. Production/DB/API/frontend/worker unchanged. NEXT_ACTION: run remaining bridge regressions in separately authorized fixture scope, then ORG-HR-03 isolated qualification and ORG-HR-04 runtime readiness; definitions do not certify enforcement.
- [x] **Phase 06K-A.1 — Design Reconciliation & Pre-Migration Gate:**
  - Chế độ thực hiện: **DESIGN CORRECTION ONLY** (Zero database mutations, zero production changes).
  - Đối soát sâu schema production: xác nhận chính xác kiểu dữ liệu (`agents.id = text`, `risk_ceiling/risk_level = integer`, `agent_versions.id = uuid`), loại bỏ các cột không tồn tại (`agents.status`, `ai_tasks.error_code`, `ai_task_steps.step_name`, `ai_task_steps.metadata`).
  - Sửa 6 Org ID chuẩn hóa (loại bỏ `org-02-edtech-ai`, `org-04-legal-gov`, `org-05-ecommerce-auto`).
  - Sửa `membership_role` (thay vì `role`) và `status = 'ACTIVE'` (uppercase) trong toàn bộ thiết kế RLS.
  - Bổ sung design `ai_task_steps` service-role only (không có RLS policy cho authenticated users trong MVP).
  - Sửa SmartTax: `requested_by_organization_id` không cấp quyền truy cập task hoặc step thô.
  - Khôi phục 12 HAIP message types chính xác; xóa 11 message types phi chuẩn khỏi toàn bộ tài liệu.
  - Xóa `ai-jobs-dlq` khỏi thiết kế; chỉ giữ 1 queue `ai-jobs`.
  - Sửa invariant trigger `trg_agents_version_invariant` để enforce `current_agent_version_id` thuộc đúng agent.
  - Thay thế mã mẫu Agent Card bằng `agent-tax-researcher` (SmartTax L1 MVP canonical agent).
  - Sửa `ai_outputs` ERD: chỉ dùng `artifact_ref`, `artifact_type`, `version`, `qa_status`, `metadata`.
  - Sửa phase sequencing: 06K-B = Draft + Dry-Run only, 06K-C = Production migration.
  - Sửa bảng legacy: xóa các bảng hư cấu (`categories`, `courses`, `lessons`, `profiles`, `system_settings`).
  - Cập nhật production SHA: `c2e32438e406ab433bef0d94a43755b3e95490a1`.
  - Đề xuất (chưa áp dụng) governance `huy-ai-center`: tạo `main` branch, branch protection, CI template.
  - Đề xuất sửa CI branch matching: `feat/**` → `feature/**` (sẽ áp dụng trong 06K-B).
  - Ban hành: `docs/PHASE_06K_A1_RECONCILIATION_REPORT.md` và `docs/architecture/06K_A1_REPOSITORY_GOVERNANCE.md`.
- [x] **Phase 06K-A — Multi-Org Database Architecture + Agent Card V2 Persistence Design:**
  - Chế độ thực hiện: **DESIGN ONLY** (Bảo toàn tuyệt đối 0 DDL, 0 migration, 0 mutation trên Supabase Production `HuyAI`).
  - Đối soát độc lập trạng thái cơ sở dữ liệu: Xác nhận đúng 34 bảng public (19 bảng legacy chứa 239 rows nguyên vẹn 100% + 15 bảng HAIP AI Center). `agents` = 0 rows, `agent_versions` = 0 rows, `ai-jobs` queue = 0 ready messages.
  - Hoàn tất 8 tài liệu thiết kế kiến trúc chuẩn mực:
    1. `docs/architecture/06K_A_CURRENT_SCHEMA_BASELINE.md`: Báo cáo đối soát 34 bảng & chỉ mục production.
    2. `docs/architecture/06K_A_MULTI_ORG_ERD.md`: Sơ đồ quan hệ thực thể phân loại EXISTING / NEW / EXTENDED.
    3. `docs/architecture/06K_A_MULTI_ORG_SCHEMA_DESIGN.md`: Bản thiết kế pseudo-DDL 4 bảng mới (`organizations`, `departments`, `organization_memberships`, `ai_policies`), 5 bảng mở rộng (`agents`, `agent_versions`, `ai_tasks`, `ai_task_steps`, `ai_outputs`), ON DELETE rules và Dispatcher index.
    4. `docs/architecture/06K_A_AGENT_CARD_V2_SPEC.md`: Đặc tả JSON Schema 2.0 hoàn chỉnh, mã mẫu SmartTax L1, cơ chế băm SHA-256 đối soát toàn vẹn, nguyên tắc bất biến phiên bản và quyết định con trỏ Model B (`current_agent_version_id`).
    5. `docs/architecture/06K_A_POLICY_AND_RLS_MODEL.md`: Mô hình kế thừa chính sách 4 cấp (`GROUP` -> `ORGANIZATION` -> `DEPARTMENT` -> `AGENT`), cơ chế trần bảo mật nghiêm ngặt nhất (Strictest-wins), cô lập hermetic "Tax Vault" SmartTax, và chính sách RLS default-deny sử dụng STABLE helper functions.
    6. `docs/architecture/06K_A_QUEUE_ENVELOPE_SPEC.md`: Chuẩn hóa phong bì hàng đợi HAIP Message Envelope V2 trên `ai-jobs` PGMQ và giao thức 5 bước xác thực bất biến cơ sở dữ liệu của Dispatcher trước khi giao việc cho Worker Node.
    7. `docs/architecture/06K_A_MIGRATION_SEQUENCE_PLAN.md`: Quy trình di trú an toàn 15 bước tuần tự không gây gián đoạn (zero-downtime, strictly additive) và quy trình hoàn tác (rollback down-migration) hoàn chỉnh cho Phase 06K-B.
    8. `docs/architecture/06K_A_SECURITY_TEST_MATRIX.md`: Ma trận 24 ca kiểm thử an ninh đa tổ chức, cô lập SmartTax, tính toàn vẹn Agent Card và trần rủi ro.
  - Ban hành báo cáo tổng thể: `docs/PHASE_06K_A_DESIGN_REPORT.md`.
- [x] **Phase 06J-UX-C.1 — Human Staging Review (Pre-Production Acceptance Gate):**
  - Thẩm định trực quan toàn diện trên môi trường Vercel Preview HTTPS (`https://edtech-ai-portfolio-azmg886h4-huytechonologyais-projects.vercel.app/v2`).
  - Đạt chuẩn 100% các tiêu chí: Hero, 6 Đơn vị thành viên, AI Agency phân cấp chuẩn, Giải pháp, Sản phẩm, An ninh 4 trụ cột, Nhà sáng lập & 2 giải thưởng 2020, Form liên hệ Staging, Footer và Menu di động.
  - Đính chính tình trạng GitHub Draft PR: Chưa tạo PR cụ thể, link khởi tạo PR so sánh sẵn sàng.
  - Khuyến nghị kích hoạt GitHub Branch Protection trên nhánh `main` trước khi mở rộng tác tử.
  - Quyết định nghiệm thu: `APPROVED_FOR_PRODUCTION_CUTOVER`.
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
- Không có (Phase 06K-A đã hoàn tất 100% tài liệu thiết kế và đối soát baseline).

---

## PENDING
- [x] Phase 06K-A architecture reviewed before the isolated 06K-B/06K-B.1 work.
- [x] Phase 06K-B/06K-B.1 migration draft, isolated validation and hardening completed; production apply remains gated.

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
- `scratch/edtech-ai-portfolio`: Next.js 16 (Turbopack). Nhánh `main` (commit `e8a24c6`, release tag `corporate-v2.0.0`). Đã chuyển giao sản xuất chính thức tại Phase 06J-UX-D và hoàn tất củng cố quản trị tại Phase 06J-UX-D.1. Toàn bộ 57 routes biên dịch thành công 100%. Tên miền `https://www.huycncdsai.io.vn` đang hoạt động ổn định.

---

## POST_LAUNCH_GOVERNANCE_STATE
- **CORPORATE_V2:** PRODUCTION_LIVE
- **DEFAULT_BRANCH:** main
- **PRODUCTION_CUTOVER:** PASS
- **ROLLBACK:** READY (`pre-corporate-v2-cutover-2026-09-21` & `corporate-v2.0.0`)
- **BRANCH_PROTECTION:** ACTIVE (Ruleset `Protect main — Production` ACTIVE on GitHub)
- **SOURCE_CONTROL_GOVERNANCE_GATE:** CLOSED / PASS
- **AI_DEV_BRIDGE_A_2:** PASS (CI test isolation complete, Quality Gate blocking)
- **SEC_INCIDENT_01:** RESOLVED (Credential rotated, active branch history remediated)
- **GITHUB_ACTIONS_CI:** CONFIGURED (`.github/workflows/ci.yml`, Job: `Quality Gate`, Node v22, Overall Workflow: SUCCESS)
- **EXACT_STATUS_CHECK:** `Quality Gate` (Status: PASS / GREEN)
- **DEBT_CONTAINMENT_POLICY:** ACTIVE
- **LEGACY_LINT_DEBT:** AUDITED (Diagnostic non-blocking job `Legacy Lint Audit`)
- **NPM_SECURITY_AUDIT:** AUDITED
- **SOURCE_CONTROL_GOVERNANCE:** ACTIVE (Set of 6 governance policies enforced)
- **AI_AGENT_PRODUCTION_WRITE:** DENY_BY_DEFAULT
- **NEXTJS_SECURITY_HOTFIX:** COMPLETED

---

## WORKER_STATE
- `apps/dispatcher`: HAIP Router Architecture đã đối soát và kiểm thử đơn vị; **chưa triển khai (NOT DEPLOYED)**.

---

## PHASE_06K_B_1_STATE
- **STATUS:** COMPLETED (Pre-production Migration Evidence & Fail-Closed Hardening)
- **DATABASE_ISOLATION_GATE:** CONFIGURED (`.github/workflows/ci.yml`, Job: `06K-B Isolated DB Integration` with blocking isolated Postgres 17 service)
- **CANONICAL_HASHING:** RECURSIVE_DETERMINISTIC (`@huy-ai/contracts` `canonicalSha256`, nested mutation sensitive, key-order invariant)
- **CLASSIFICATION_CEILING:** FAIL_CLOSED (`data_classification_rank(unknown)` returns NULL, SQL comparison evaluates to NULL)
- **CANONICAL_SEED_DRIFT_PROTECTION:** ACTIVE (Post-insert validation DO block verifies 6 orgs and 65 depts; aborts with `CANONICAL_SEED_DRIFT` on mismatch)
- **EVIDENCE_GENERATION:** DYNAMIC_LIVE_CATALOG_MEASURED (All schema metrics, counts, constraints, test passes captured from PostgreSQL catalogs and test runners)
- **PRODUCTION_SCOPE:** ZERO_TOUCH (Production `bdeluacbzbdflxubhpha` untouched; isolated `phase06kb_test` on loopback used exclusively)

---

## TEST_STATUS
- **Contracts & HAIP Unit Tests:** PASS (30/30 tests).
- **Core Tests:** PASS (58/58 tests).
- **Automation Bridge Tests:** PASS (99/99 tests).
- **06K-B Multi-Org Security Tests:** PASS (39/39 tests across 7 suites).
- **06K-B Automated Dry Run Lifecycle:** PASS (All 12 stages: preflight, baseline, baseline-contract, apply, second-apply, schema-after, negative-tests, security-tests, rollback, baseline-verification, reapply, final-verification).
- **TypeScript Compile:** PASS (Toàn bộ workspaces).
- **Quality Gate:** 100% PASS.

---

## KNOWN_ISSUES
- Không có.

---

## PRIOR_NEXT_PHASE_NOTE (historical)
06K-C — CONTROLLED PRODUCTION MIGRATION (Requires new explicit Human Owner authorization).

---

## PRIOR_NEXT_ACTION (historical)
HARD_STOP_ENGAGED (Phase 06K-B.1 hoàn tất củng cố fail-closed hardening và evidence generation: 39/39 security tests PASS, 12/12 stages dry run lifecycle PASS trên isolated database `phase06kb_test`, 0 chạm production. Nhánh feature/06k-b-migration-dry-run đã sẵn sàng tại PR #1. Dừng lại chờ Human Owner phê duyệt trước khi cấp quyền Phase 06K-C).

## AI HR bootstrap — 2026-09-27
- CURRENT_PHASE: ORG-HR-01 PARTIAL; task `ai-hr-bootstrap`; CURRENT_BRANCH: `agent-task/ai-hr-bootstrap`.
- COMPLETED: [x] Planning charter, fail-closed policy contract, initial staffing plan; DATABASE/API/FRONTEND/WORKER unchanged.
- TEST_STATUS: HR boundary tests 6/6 PASS, npm run typecheck PASS, npm run test:bridge 129/129 PASS. Prior totals above are historical.
- KNOWN_ISSUES: None. Runtime enforcement is not yet verified and runtime dispatch remains disabled.
- DECISIONS: All 12 roles UNVERIFIED, zero permissions, runtime disabled; contract assertions do not establish runtime enforcement.
- IN_PROGRESS/PENDING/NEXT_ACTION: Complete ai-workforce-plan, runtime enforcement verification and three independently reviewed probation tasks per role before allocation.

## Core AI Team Recruitment — 2026-09-28
- CURRENT_PHASE: ORG-HR-02 PARTIAL (offline fixture verification complete); task `ai-core-team-recruitment`; CURRENT_BRANCH: `agent-task/ai-core-team-recruitment`.
- COMPLETED: [x] Six-role roster, probation policy, receipt schema and 18 synthetic task/receipt checks; Architecture/Planning, Antigravity Coding, QA, Security, DevOps/SRE, Data Engineering.
- DATABASE/API/FRONTEND/WORKER: UNCHANGED; no production access.
- TEST_STATUS: Reverified 2026-09-28: Python automation 52/52 PASS (3 recruitment/receipt test methods, 18 task fixtures); workspace typecheck PASS (--incremental false); selected TypeScript test files 8/8 PASS via node --import tsx (3 core, 5 read-only bridge); full bridge suite not run because it writes forbidden paths. Recruitment checks reject malformed outputs/profiles, noncanonical role capabilities, altered task definitions, non-isolated/live tasks and secret-bearing mock output even with a recomputed checksum; successful and rejected validation preserve evidence and replay state; verification rejects unavailable/invalid policy or roster data, permissive or renamed safety gates, missing path controls, altered forbidden paths or path-boundary flags, weakened rollback or sandbox settings, enabled runtime dispatch or a substituted receipt schema. Cumulative diff: 200 added/deleted lines including untracked files.
- KNOWN_ISSUES: Real provider capabilities, reviewer identity and sandbox enforcement remain unverified. All roles UNVERIFIED, permissions empty, runtime dispatch disabled.
- DECISIONS: Fixture PASS never grants authority. Records below list role, ordered task IDs from roster, and corresponding canonical output SHA-256 values; all are fixture-only PASS with simulated independent-qa reviewer, zero secret exposure/mutations and safety flags true.
- IN_PROGRESS/PENDING/NEXT_ACTION: Qualify runtime isolation and independently review real probation outputs before human-approved activation.
- RECEIPTS chief-architect: task-prob-arch-001=6b28e05e4a807576cd9a896e124d19c924ec93f73d1b79aa66854b8be78cdc80; task-prob-arch-002=5e30d74289f10bf3d178ac3824699f5f5665724d7829487de98a31d630feda13; task-prob-arch-003=d39bfd6dfa7b1f6b5bdd3f526f8dd67cb1cb12c1342bad97534154c5683e27f0.
- RECEIPTS primary-coder: task-prob-code-001=6b968157468c2f151bf833b43b5252a631c0bce8d8231404bdfdf20dd455b2be; task-prob-code-002=9fb235fed28471817da0e9318b09d5a16b11084d6f6559e88f5650ae5ac84757; task-prob-code-003=8dfc35ca1fb6dbbe2f4ec90f6fc2b6fb6a5ce39f18c06bde8c77896645d61d5d.
- RECEIPTS qa: task-prob-qa-001=576a2f83105b462bb34f3de9639918cdfe3c9ac0599d56c8b0494fd71608191c; task-prob-qa-002=065613757f01e66073d82f19b4a8d287545c28cee7f4605196ee3713eec8eafe; task-prob-qa-003=4bc00207c9b8dcabd06b975d8796ab915521cc655aaef0459ea5014a1098299c.
- RECEIPTS security: task-prob-sec-001=8c17eb082a78f14ff2dfd2dd49c633a63a5cff17f1bf7f9ff4f4344d05766df5; task-prob-sec-002=c693f9dd5e6bc2aac6fa30021843c7faa82df22f7585f88026b97bb2abba039f; task-prob-sec-003=1a2c081bf92f95f09f24c0ec023779ecd6455ea68b4e42599f420ea314c4df38.
- RECEIPTS devops: task-prob-ops-001=cb5ecc7aea207a9ff89c7212be601dfe771f32f41e9f0d62adbbe34691c61721; task-prob-ops-002=c5f6073ff01a1f117473f6ef5eb1f6eb702694a2da9ef569ace28d81133f504c; task-prob-ops-003=439a5ef3132e8116e080e48f992c9c1df80bd2dabde0c5ba780656d34a4c48e4.
- RECEIPTS data: task-prob-data-001=3e30fc0c25700543a8c2b23ee9409878bd1b7505e24207b5d86e0f81a320f9b9; task-prob-data-002=31c5d54d4919438801b7655eab81da6e395ca6d5ce2c9a984a33677334e5bb0b; task-prob-data-003=e95d272964eddb2f7244239921165a9749d2637d431a751cf378a96b5c31ee7a.

## AI Organization Readiness — 2026-09-28
- CURRENT_PHASE: ORG-HR-04 BLOCKED; priority remains ORG_READINESS; all 12 roadmap items mapped to accountable owners, capability requirements, proposed scopes, candidate fallback chains and probation references.
- COMPLETED: Pure typed snapshot evaluator; 43 offline readiness cases including outage, privilege/budget limits, tampering and revocation; no grants or runtime activation.
- TEST_STATUS: 139 selected TypeScript tests PASS (including 43 readiness); 52 Python automation tests PASS; workspace typechecks and strict evaluator typecheck PASS. Full bridge suite excluded because it writes forbidden paths; no build outputs generated.
- BLOCKERS/NEXT_ACTION: Task owners and ai-hr-001 must qualify real probation; security must verify scoped authority; devops must verify provider availability/authorization/cost; chief-architect must verify runtime enforcement and evidence provenance. Resolution criteria: docs/organization/readiness.md. Technical roadmap priority remains withheld until every criterion passes; existing human gates remain mandatory.

## 06k-c-readiness — 2026-09-28
- PROJECT: HUY AI Center; read-only production migration readiness planning.
- CURRENT_PHASE: PARTIAL; planning packet complete, production readiness BLOCKED; CURRENT_BRANCH: `agent-task/06k-c-readiness`.
- COMPLETED: [x] [Packet](docs/automation/06K_C_READINESS_PACKET.md) and C01–C29 manual planning acceptance review.
- IN_PROGRESS / PENDING: [ ] Verified snapshot, immutable manifest/checksums, exact commands/SQL, recovery evidence, operator/window and explicit R4 approval.
- DATABASE_STATE: Current production state UNVERIFIED; historical claims above are not current evidence. No production connection or mutation performed.
- API_STATE / FRONTEND_STATE / WORKER_STATE: No changes in this task.
- TEST_STATUS: Rechecked 2026-09-28T11:55:35Z; typecheck with incremental disabled exit 0; prior draft records test:core exit 1 (sandbox IPC EPERM; workspace tests discovered zero tests); direct loader fallback rechecked, passed 3/3 source file suites.
- KNOWN_ISSUES / DECISIONS: Missing authorized evidence blocks readiness; approval PENDING; no forbidden evidence inspection or production execution to resolve gaps.
- NEXT_ACTION: Supply sanitized evidence in allowed paths, finalize reviewed artifacts, then obtain separately bound R4 execution approval; recovery mutations require explicit authorization.
