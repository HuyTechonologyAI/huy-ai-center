# HUYAI FINAL PRE-APPLY REPORT
## HUY TECHNOLOGY AI CENTER — PHASE 06D

**Date:** 2026-09-20  
**Status:** RECONCILED & VALIDATED (AWAITING HUMAN APPROVAL)  
**Target Environment:** Supabase Project `HuyAI` (Singapore, Ref: `bdeluacbzbdflxubhpha`)

---

## 1. MANDATORY ARCHITECTURAL DECLARATIONS

```text
EXISTING TABLES: 19
NEW TABLES: 15
ALL 15 NEW TABLES SECURITY REVIEWED: PASS

ORDERS USED FOR AI USAGE: NO

AI CREDIT SYSTEM:
DEFERRED

AUDIT_LOGS:
USER/ADMIN AUDIT ONLY

PGMQ:
YES

QUEUE:
ai-jobs

QUEUE TYPE:
DURABLE BASIC QUEUE

QUEUE EXPOSED TO CLIENT:
NO

REDIS:
NO

DDL APPLIED:
ZERO
```

---

## 2. RECONCILED LIVE INVENTORY (19 TABLES)

The public schema of `HuyAI` Singapore contains precisely **19 tables**, all verified in read-only mode:

1. `contacts` — Intact (Zero-touch)
2. `videos` — Intact (Zero-touch)
3. `resources` — Intact (Zero-touch)
4. `resource_views` — Intact (Zero-touch)
5. `premium_contents` — Intact (Zero-touch)
6. `item_reviews` — Intact (Zero-touch)
7. `audit_logs` — Reused and safely extended with `ADD COLUMN IF NOT EXISTS` (USER/ADMIN AUDIT ONLY)
8. `user_activity_metrics` — Intact (Zero-touch)
9. `student_points_balance` — Intact (Zero-touch, reserved for student gamification)
10. `daily_tasks` — Intact (Zero-touch, student daily learning assignments)
11. `task_completions` — Intact (Zero-touch)
12. `cms_folders` — Intact (Zero-touch)
13. `orders` — Intact (Zero-touch, NOT used for AI compute consumption / token usage / job credit deduction / model accounting)
14. `cms_settings` — Intact (Zero-touch)
15. `knowledge_chunks` — Reused for AI RAG embeddings via `pgvector`
16. `user_video_progress` — Intact (Zero-touch)
17. `user_document_progress` — Intact (Zero-touch)
18. `leads` — Intact (Zero-touch)
19. `site_content` — Intact (Zero-touch)

---

## 3. FULL SECURITY & RLS COVERAGE FOR ALL 15 NEW TABLES

Every single one of the **15 new tables** has been reviewed, equipped with Row-Level Security, and indexed:

| STT | New Table Name | Module | RLS Status | Client Policy | Service-Role Access | Covering Indexes | Security Review |
| :---: | :--- | :--- | :---: | :---: | :---: | :--- | :---: |
| 1 | `ai_tasks` | AI Operations | **ENABLED** | Own rows only | **FULL** | `user_id`, `queue_poll` | **PASS** |
| 2 | `ai_task_steps` | AI Operations | **ENABLED** | Own task only | **FULL** | `task_id, step_number` | **PASS** |
| 3 | `ai_outputs` | AI Operations | **ENABLED** | Own task only | **FULL** | `task_id` | **PASS** |
| 4 | `nodes` | Infrastructure | **ENABLED** | Read-only | **FULL** | `status` | **PASS** |
| 5 | `node_heartbeats` | Infrastructure | **ENABLED** | Read-only | **FULL** | `node_id, created_at` | **PASS** |
| 6 | `ai_providers` | AI Registry | **ENABLED** | Active only | **FULL** | Primary Key | **PASS** |
| 7 | `ai_models` | AI Registry | **ENABLED** | Active only | **FULL** | `provider_id` | **PASS** |
| 8 | `tools` | AI Registry | **ENABLED** | Active only | **FULL** | Primary Key | **PASS** |
| 9 | `tool_versions` | AI Registry | **ENABLED** | Active only | **FULL** | `tool_id, version` | **PASS** |
| 10 | `tool_capabilities`| AI Registry | **ENABLED** | Public read | **FULL** | `tool_id, capability` | **PASS** |
| 11 | `agents` | AI Registry | **ENABLED** | Active only | **FULL** | Model FK | **PASS** |
| 12 | `agent_versions` | AI Registry | **ENABLED** | Public read | **FULL** | `agent_id, version` | **PASS** |
| 13 | `github_projects` | GitHub Radar | **ENABLED** | ❌ **Blocked** | **FULL (Server-Only)**| `category`, `monitored` | **PASS** |
| 14 | `github_reviews` | GitHub Radar | **ENABLED** | ❌ **Blocked** | **FULL (Server-Only)**| `project_id` | **PASS** |
| 15 | `github_versions` | GitHub Radar | **ENABLED** | ❌ **Blocked** | **FULL (Server-Only)**| `project_id` | **PASS** |

*All 15 new tables security reviewed: **PASS**.*

---

## 4. QUEUE ARCHITECTURE VERIFICATION

- **Queue Engine:** `pgmq` only (Supabase Queues v1.5.1 available).
- **Queue Identifier:** `ai-jobs`
- **Queue Type:** **DURABLE BASIC QUEUE** (logged, WAL-backed heap tables `pgmq.q_ai_jobs`).
- **Client Exposure:** **NO** (`pgmq` and `pgmq_public` are strictly inaccessible to `anon` and `authenticated` browser roles; consumed exclusively via server-side Dispatcher credentials).
- **Redis / Upstash:** **NO** (0% usage, $0.00/mo cost).
- **Custom `queue_messages` table:** **NO** (Completely removed).

---

## 5. BUSINESS LOGIC & AUDIT BOUNDARIES

- **Orders & Payments:** `public.orders` is preserved 100% for existing payment/order purposes. **NOT** used for AI compute consumption, token usage, job credit deduction, or model usage accounting.
- **AI Credit System:** **DEFERRED** in V1. No credit/wallet tables created in this phase.
- **Audit Logs Reuse:** `public.audit_logs` is strictly scoped to **USER/ADMIN AUDIT ONLY** (actions with a legitimate user/admin identity). Node states are recorded in `nodes`/`node_heartbeats`, and worker runtime events in structured dispatcher logs. Existing NOT NULL constraints remain untouched.

---

## 6. STATIC VALIDATION & TEST SUITE RESULTS

- **SQL Validation (`scripts/validate-sql.ps1`):** **PASS**
  - 5/5 SQL migration files parsed cleanly.
  - Zero hardcoded API keys or service-role secrets.
  - Zero destructive `DROP DATABASE` or `DROP TABLE` statements.
  - 100% RLS enforcement confirmed across all 15 new tables and extended `audit_logs`.
- **Code Hygiene & Safety Suite (`scripts/verify-safety.ps1`):** **PASS**
  - Zero `.env` files tracked in Git.
  - TypeScript compile across 5/5 workspaces: **0 errors**.
  - Unit & Integration tests: **30/30 passed (100%)**.

---

## 7. FINAL GATEWAY & APPROVAL STATUS

- **DDL APPLIED TO PRODUCTION:** **ZERO**.
- **Execution State:** **STOPPED**.
- **Next Step:** Awaiting explicit written human approval before applying migrations to `HuyAI` Singapore.
