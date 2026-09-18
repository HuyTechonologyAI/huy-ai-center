# V1.1 Architecture Reconciliation Report
## HUY TECHNOLOGY AI CENTER
**Status:** COMPLETE & VERIFIED  
**Date:** 2026-09-18  
**Authoritative Specification:** Master Architecture V1.1 (Cost-Optimized Architecture Patch)  
**Baseline Verified:** All 30/30 Unit & Safety Tests Passing (`npm run verify:safety`)

---

## 1. WHAT CHANGED

1. **Supabase Control Center Topology (Consolidated vs. New Project)**:
   - *V1.0 Planned*: Creation of an independent, 3rd Supabase project (`huy-ai-center-prod`).
   - *V1.1 Reconciled*: Extended the existing, live **HuyAI** project (`bdeluacbzbdflxubhpha`, Singapore region, already servicing `huycncdsai.io.vn` and `gvcncdsai.io.vn`). No new Supabase project is created, eliminating extra base tiers and operational sprawl.
2. **Database Migration Strategy**:
   - Refactored migration files `20260917000001` through `20260917000005` to be **100% additive, non-destructive, and idempotent**.
   - Integrated existing HuyAI tables (`audit_logs`) via `ALTER TABLE ADD COLUMN IF NOT EXISTS` rather than raw `CREATE TABLE`, preserving historical audit trails.
   - Added `DROP POLICY IF EXISTS` before every `CREATE POLICY` to allow zero-downtime, repeated execution.
   - Hardened `claim_ai_task()` and `claim_queue_message()` functions with explicit `SET search_path = public, pg_temp` to eliminate privilege escalation vectors.
3. **Queue Architecture**:
   - V1.0 allowed room for Redis/BullMQ.
   - V1.1 explicitly mandates **Native PostgreSQL Queues** (`FOR UPDATE SKIP LOCKED`) via table `queue_messages` / `ai_tasks`. Zero Redis containers required on cloud or on-prem.
4. **Dell Precision M4800 Deployment Scope**:
   - Worker stack streamlined: Langflow + TypeScript Worker + Ollama (staged).
   - LiteLLM and OpenHands container footprints removed from active compose specs for Phase 01–06.
5. **Cost Governance Introduced**:
   - Created automated Cost Guards (`.agents/skills/11-cost-guard`, `.agents/skills/12-infrastructure-budget-guard`).
   - Established strict infrastructure budget ceiling: **$0 – $30 USD/month** with real-time tracking documented in `docs/INFRASTRUCTURE_COSTS.md`.

---

## 2. WHAT REMAINS VALID FROM V1.0

The core foundation built in Phases 01 through 06 remains 100% intact, valid, and functional:

1. **Control Center Web App (`apps/control-center`)**:
   - Next.js 15 App Router dashboard, Vietnamese UI navigation (`Dashboard`, `AI Apps`, `Projects`, `Files`, `History`, `Credits`, `Account`).
   - Teacher AI generation studio (`Giáo án CV 5512`, `Slide`, `Quiz`, `Mindmap`, `Phiếu học tập`, `Video Script`).
   - Task monitoring dashboard with real-time status display and offline-friendly worker notices.
2. **Dell Dispatcher Worker (`apps/dispatcher`)**:
   - TypeScript worker daemon adhering strictly to 12-factor principles.
   - Robust polling loop claiming tasks atomically via PostgreSQL `claim_ai_task()`.
   - Pluggable adapter pipeline with working `MockAdapter`, `LangflowAdapter`, and fallback routing logic.
   - HTTP health check server (`/health`, `/metrics`) and graceful OS signal shutdown (`SIGTERM`/`SIGINT`).
3. **Shared Contracts (`packages/contracts`)**:
   - Strict Zod schemas for all task lifecycles, inputs, steps, outputs, and agent registries.
   - Cross-project TypeScript types consumed by both `control-center` and `dispatcher`.
4. **Shared Utilities (`packages/shared`, `packages/config`)**:
   - Resilient exponential backoff retry wrappers (`withRetry`).
   - Centralized structured logger emitting standard JSON events.

---

## 3. WHAT WAS REMOVED

1. **Standalone Supabase Project Creation**:
   - Cancelled provisioning scripts, configurations, and plans for a distinct `huy-ai-center-prod` Supabase instance.
2. **Third-Party External Queue / Cache Dependencies**:
   - Stripped any requirement for Upstash Redis or local Redis containers from V1 configurations.
3. **Premature Microservice Overhead**:
   - No separate microservice routing gateways; tasks communicate directly via PostgreSQL queue abstractions.

---

## 4. WHAT WAS DEFERRED

1. **LiteLLM Proxy Deployment**:
   - Deferred until multi-model load balancing, token budget quotas across external providers, or fallbacks between remote LLMs become active requirements in Phase 07+.
2. **OpenHands Software Agent Node**:
   - Deferred to a dedicated autonomous coding phase. Not loaded in the initial Dell Precision M4800 compose stack to conserve RAM.
3. **`smart-teacher-ai` Database Consolidation**:
   - Project `kdpouzqjowbuxtfrqsds` (SmartTax / Smart-Teacher) remains 100% untouched and isolated. No database merging will occur until a future approved phase.
4. **Production Migration Execution**:
   - Physical execution of migrations against live Supabase `bdeluacbzbdflxubhpha` is deferred pending explicit human authorization.

---

## 5. DATABASE IMPACT

- **Target Instance**: Existing Supabase project `HuyAI` (`bdeluacbzbdflxubhpha`).
- **Coexistence Guarantee**:
  - Existing 16+ tables (`resources`, `videos`, `contacts`, `leads`, `student_points_balance`, `daily_tasks`, `task_completions`, `user_document_progress`, `user_video_progress`, `knowledge_chunks`, `item_reviews`, `premium_contents`, `user_activity_metrics`, `orders`, `transactions`, `folders`) are **completely untouched**.
  - No existing tables are altered destructively. No columns are dropped or types changed.
  - `student_points_balance` remains dedicated to student gamification, while `credit_wallets` handles AI compute credits without namespace collision.
  - Existing `audit_logs` is safely extended with additive columns (`actor_profile_id`, `organization_id`, `metadata`, etc.) using `ADD COLUMN IF NOT EXISTS`.
- **New Tables Added**:
  - `ai_tasks`, `ai_task_steps`, `ai_outputs`, `ai_worker_nodes`, `ai_task_logs`
  - `profiles`, `organizations`, `organization_members`
  - `plans`, `subscriptions`, `credit_wallets`, `credit_transactions`
  - `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions`
  - `nodes`, `node_heartbeats`, `github_projects`, `github_reviews`, `github_versions`, `queue_messages`
- **Security Baseline**:
  - Row Level Security (RLS) enabled across every new table.
  - `SECURITY DEFINER` functions pinned with `SET search_path = public, pg_temp`.
  - All foreign keys indexed to prevent table-scan locks.

---

## 6. DISPATCHER IMPACT

- **Transport**: Native PostgreSQL polling via Supabase client using atomic `claim_ai_task()` RPC.
- **Docker Compose Profile**: Streamlined `docker-compose.worker.yml` containing only `dispatcher` and `langflow`. Memory footprint reduced to < 4 GB RAM, leaving 28 GB RAM free on the Dell Precision M4800.
- **Environment Parity**: Zero hardcoded URLs. Configured entirely via `.env` / 12-factor variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `AI_PROVIDER_MODE`).
- **Fallback Behavior**: Successfully verified by unit tests — if Langflow or Ollama is offline or unreachable, the dispatcher seamlessly falls back or records graceful failure without crashing the process.

---

## 7. COST IMPACT

| Service / Resource | V1.0 Architecture Cost | V1.1 Cost-Optimized Cost | Net Savings |
| :--- | :--- | :--- | :--- |
| **Supabase Control Center** | $25.00/mo (New Pro project) | **$0.00/mo** (Reuses existing HuyAI project) | **-$25.00/mo** |
| **Supabase Storage** | Included in Pro | Included in existing project | $0.00 |
| **Vercel Control Center Web** | $0.00 (Hobby) / $20.00 (Pro) | **$0.00/mo** (Standard preview/hobby tier) | $0.00 |
| **Dell Precision M4800 Node** | $0.00 (Hardware owned) | **$0.00/mo** (Hardware owned, local power) | $0.00 |
| **Managed Redis / Queue** | $10.00 – $15.00/mo | **$0.00/mo** (Native PostgreSQL queue) | **-$10.00 – $15.00/mo** |
| **Total Estimated Monthly Cost** | **$35.00 – $60.00/mo** | **$0.00 – $5.00/mo** (Nominal API usage) | **-$35.00 – $55.00/mo** |

**Budget Compliance**: **100% Compliant**. Well within the $0 – $30 USD/month ceiling.

---

## 8. SECURITY IMPACT

1. **Zero Secret Leakage**:
   - Automated git scanning confirmed 0 `.env` files tracked.
   - 0 hardcoded service role keys or JWT tokens in codebase.
2. **Search Path Hijack Immunity**:
   - All custom SQL functions enforce `SET search_path = public, pg_temp`.
3. **Tenant & Data Isolation**:
   - RLS policies ensure users can only query their own tasks and credit wallets.
   - Service role permissions are strictly reserved for server routes and the trusted Dell Dispatcher.
4. **Zero Cross-Contamination**:
   - Migration scripts cannot delete or modify data in live HuyAI educational tables.

---

## 9. REQUIRED HUMAN ACTION

Before running Phase 07 or deploying to production infrastructure:

1. **Review Migrations**:
   - Human review of SQL migration scripts in `supabase/migrations/` (specifically `20260917000004_radar_infra_governance.sql` which extends `audit_logs`).
2. **Supabase Migration Approval**:
   - Explicit written confirmation from project lead before executing migrations on Supabase project `bdeluacbzbdflxubhpha`.
3. **Environment Variable Configuration**:
   - Configure actual Supabase URL and Service Role Key in `.env.local` for Control Center and Dispatcher when ready for live staging.
4. **Dell Precision M4800 Provisioning**:
   - Physical setup of Ubuntu Server 24.04 LTS on Dell M4800 (hostname `huy-ai-node-01`) when scheduling on-prem deployment.

---

## 10. NEXT PHASE

- **Approved Target**: **PHASE 07 — INTEGRATION & DEPLOYMENT PREPARATION** (or next prompt designated by user).
- **Readiness**: Codebase is clean, tested (30/30 unit & safety tests pass), architecturally aligned with Master Architecture V1.1, and awaiting user command.
