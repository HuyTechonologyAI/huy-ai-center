# HUYAI FINAL PRE-APPLY REPORT
## HUY TECHNOLOGY AI CENTER — PHASE 06C

**Date:** 2026-09-20  
**Status:** RECONCILED & VALIDATED (AWAITING HUMAN APPROVAL)  
**Target Environment:** Supabase Project `HuyAI` (Singapore, Ref: `bdeluacbzbdflxubhpha`)

---

## 1. MANDATORY ARCHITECTURAL DECLARATIONS

```text
LIVE TABLE COUNT
19

QUEUE ARCHITECTURE
pgmq only

REDIS
not used

CUSTOM QUEUE TABLE
not used

NEW SUPABASE PROJECT
not used

PRODUCTION TOOL SEEDS
none

PRODUCTION MODEL SEEDS
none

LEGACY SECURITY WARNINGS
documented separately

DDL APPLIED TO PRODUCTION
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
7. `audit_logs` — Reused and safely extended with `ADD COLUMN IF NOT EXISTS`
8. `user_activity_metrics` — Intact (Zero-touch)
9. `student_points_balance` — Intact (Zero-touch, reserved for student gamification)
10. `daily_tasks` — Intact (Zero-touch, student daily learning assignments)
11. `task_completions` — Intact (Zero-touch)
12. `cms_folders` — Intact (Zero-touch)
13. `orders` — Reused for AI compute billing via VietQR ACB
14. `cms_settings` — Intact (Zero-touch)
15. `knowledge_chunks` — Reused for AI RAG embeddings via `pgvector`
16. `user_video_progress` — Intact (Zero-touch)
17. `user_document_progress` — Intact (Zero-touch)
18. `leads` — Intact (Zero-touch)
19. `site_content` — Intact (Zero-touch)

---

## 3. NEW AI CENTER MODULES & RECONCILED MIGRATIONS

Five safe, idempotent, non-destructive SQL migrations prepared in `supabase/migrations/`:

| Migration File | Module | Schema Additions | Seeds Included |
| :--- | :--- | :--- | :--- |
| `20260920000001_ai_operations.sql` | **AI Operations** | `ai_tasks`, `ai_task_steps`, `ai_outputs` | None |
| `20260920000002_infrastructure.sql` | **Infrastructure** | `nodes`, `node_heartbeats` | `huy-ai-node-01` only (physical node exists) |
| `20260920000003_ai_registry.sql` | **AI Registry** | `ai_providers`, `ai_models`, `tools`, `tool_versions`, `tool_capabilities`, `agents`, `agent_versions` | **NONE** (Tables created completely empty) |
| `20260920000004_github_radar.sql` | **GitHub Radar** | `github_projects`, `github_reviews`, `github_versions` | None |
| `20260920000005_queue_and_governance.sql` | **Queue & Governance** | `pgmq` extension, queue `ai-jobs`, `claim_ai_task()`, additive extension of `audit_logs` | None (No custom `queue_messages` table) |

---

## 4. SECURITY BASELINE DISTINCTION

- **Legacy Security Baseline (`LEGACY_SECURITY_BASELINE`):**
  - Documented separately in `docs/HUYAI_RLS_MATRIX.md` (Part A).
  - Notes 4 tables with RLS enabled without policies (`cms_settings`, `leads`, `user_document_progress`, `user_video_progress`).
  - Notes mutable search_path on legacy function `public.match_knowledge_chunks`.
  - Zero modifications applied to legacy production policies in core migrations.
  - Optional independent remediation script prepared in Part C for future separate human approval.
- **AI Center Security Baseline (`AI_CENTER_SECURITY_BASELINE`):**
  - 100% RLS enabled across all 12 new tables and extended `audit_logs`.
  - Complete covering indexes for all foreign keys.
  - `SET search_path = public, pg_temp;` strictly declared on all functions.

---

## 5. STATIC VALIDATION & TEST VERIFICATION RESULTS

- **SQL Validation (`scripts/validate-sql.ps1`):**
  - 5/5 SQL migration files parsed cleanly.
  - Zero hardcoded API keys or service-role secrets.
  - Zero destructive `DROP DATABASE` or `DROP TABLE` statements.
  - 100% RLS enforcement confirmed.
- **Code Hygiene & Safety Suite (`scripts/verify-safety.ps1`):**
  - Zero `.env` files tracked in Git.
  - TypeScript compile across 5/5 workspaces: **0 errors**.
  - Unit & Integration tests: **30/30 passed (100%)**.
    - Contracts tests: 14/14 pass
    - Shared utils tests: 3/3 pass
    - Dispatcher tests: 7/7 pass
    - API logic & mock worker tests: 6/6 pass

---

## 6. FINAL GATEWAY & APPROVAL STATUS

- **Production DDL Applied:** **ZERO** (Database remains in 100% read-only state).
- **Execution State:** **STOPPED**.
- **Next Step:** Awaiting explicit written human approval from project lead / sponsor before applying migrations to `HuyAI` Singapore.
