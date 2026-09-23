# PHASE 06K-A.1: PRODUCTION SCHEMA BASELINE (RECONCILED)
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-A1-BASELINE-001  
**Phase:** 06K-A.1 (Design Reconciliation — Zero Database Mutations)  
**Inspection Date:** 2026-09-22  
**Supabase Project:** `HuyAI` (`bdeluacbzbdflxubhpha`)  
**Status:** RECONCILED BASELINE — AUTHORITATIVE  

> **CORRECTION NOTE:** This document supersedes `06K_A_CURRENT_SCHEMA_BASELINE.md` from Phase 06K-A.  
> All type, column, and data corrections are based on **live read-only inspection** of the production database.

---

## 1. Production Table Inventory (Verified)

Total: **34 public tables** (confirmed).

### 1.1 Legacy Application Tables (19 tables — ZERO TOUCH)

Verified by live inspection on 2026-09-22:

| Table | Row Count | Notes |
| :--- | ---: | :--- |
| `contacts` | 0 | — |
| `videos` | 1 | — |
| `resources` | 1 | — |
| `resource_views` | 31 | — |
| `premium_contents` | 0 | — |
| `item_reviews` | 0 | — |
| `audit_logs` | 0 | — |
| `user_activity_metrics` | 20 | — |
| `student_points_balance` | 3 | — |
| `daily_tasks` | 0 | — |
| `task_completions` | 0 | — |
| `cms_folders` | 2 | — |
| `orders` | 177 | Largest legacy dataset |
| `cms_settings` | 3 | — |
| `knowledge_chunks` | 0 | — |
| `user_video_progress` | 0 | — |
| `user_document_progress` | 0 | — |
| `leads` | 0 | — |
| `site_content` | 1 | — |

> [!CAUTION]
> **DO NOT** list fictional tables like `categories`, `courses`, `lessons`, `profiles`, `system_settings` as production tables. These were **incorrect** references in Phase 06K-A documents. The canonical legacy tables are the 19 tables listed above.

---

### 1.2 AI Center Tables (15 tables)

| Table | Row Count | Notes |
| :--- | ---: | :--- |
| `ai_tasks` | 0 | Clean registry |
| `ai_task_steps` | 0 | Clean registry |
| `ai_outputs` | 0 | Clean registry |
| `nodes` | 1 | `huy-ai-node-01` (OFFLINE) |
| `node_heartbeats` | 0 | — |
| `ai_providers` | — | Accessible |
| `ai_models` | — | Accessible |
| `tools` | — | Accessible |
| `tool_versions` | — | Accessible |
| `tool_capabilities` | — | Accessible |
| `agents` | 0 | Empty — not yet seeded |
| `agent_versions` | 0 | Empty — not yet seeded |
| `github_projects` | — | Accessible |
| `github_reviews` | — | Accessible |
| `github_versions` | — | Accessible |

---

## 2. Verified Column Inventory (Production Ground Truth)

### 2.1 Table: `agents`

| Column | Production Status | Data Type (Verified) |
| :--- | :--- | :--- |
| `id` | ✅ EXISTS | `text` (canonical ID, e.g. `agent-tax-researcher`) |
| `name` | ✅ EXISTS | `text` |
| `description` | ✅ EXISTS | `text` |
| `capabilities` | ✅ EXISTS | `jsonb` or `text[]` |
| `configuration` | ✅ EXISTS | `jsonb` |
| `risk_ceiling` | ✅ EXISTS | `integer` (0–4, NOT text) |
| `enabled` | ✅ EXISTS | `boolean` |
| `health_status` | ✅ EXISTS | `text` |
| `max_parallel_tasks` | ✅ EXISTS | `integer` |
| `created_at` | ✅ EXISTS | `timestamptz` |
| `updated_at` | ✅ EXISTS | `timestamptz` |
| `assigned_capability` | ❌ NOT FOUND | — |
| `runtime` | ❌ NOT FOUND | — |
| `hierarchy_level` | ❌ NOT FOUND | New column (ADD in 06K-B) |
| `status` | ❌ NOT FOUND | Do NOT reference as existing |
| `is_active` | ❌ NOT FOUND | Do NOT reference |
| `node_affinity` | ❌ NOT FOUND | — |

> [!IMPORTANT]
> **`agents.id` is `text`**, not `uuid`. This is critical for all FK references and RLS policy code.  
> **`agents.status` does NOT exist**. Use `agents.enabled` (boolean) and `agents.health_status` (text) for health checks.

---

### 2.2 Table: `agent_versions`

| Column | Production Status | Data Type (Verified) |
| :--- | :--- | :--- |
| `id` | ✅ EXISTS | `uuid` |
| `agent_id` | ✅ EXISTS | `text` (FK → `agents.id`) |
| `version` | ✅ EXISTS | `text` (SemVer) |
| `capabilities` | ✅ EXISTS | `jsonb` or `text[]` |
| `accepted_inputs` | ✅ EXISTS | `jsonb` |
| `output_types` | ✅ EXISTS | `text[]` or `jsonb` |
| `runtime` | ✅ EXISTS | `text` |
| `risk_ceiling` | ✅ EXISTS | `integer` (0–4, NOT text) |
| `max_parallel_tasks` | ✅ EXISTS | `integer` |
| `configuration` | ✅ EXISTS | `jsonb` |
| `metadata` | ✅ EXISTS | `jsonb` |
| `schema_version` | ✅ EXISTS | `text` |
| `created_at` | ✅ EXISTS | `timestamptz` |
| `agent_card` | ❌ NOT FOUND | New column (ADD in 06K-B) |
| `agent_card_hash` | ❌ NOT FOUND | New column (ADD in 06K-B) |

> [!IMPORTANT]
> **`agent_versions.id` is `uuid`**. `agent_versions.agent_id` is `text`.  
> `current_agent_version_id` on `agents` will be `uuid` (FK → `agent_versions.id`). Cross-type FK constraint is valid: `text PK ← uuid FK` is NOT valid. The pointer goes `agents(current_agent_version_id uuid) → agent_versions(id uuid)`.

---

### 2.3 Table: `ai_tasks`

| Column | Production Status | Data Type (Verified) |
| :--- | :--- | :--- |
| `id` | ✅ EXISTS | `uuid` |
| `assigned_agent_id` | ✅ EXISTS | `text` (FK → `agents.id text`) |
| `risk_level` | ✅ EXISTS | `integer` (0–4, NOT text `"R2"`) |
| `status` | ✅ EXISTS | `text` |
| `priority` | ✅ EXISTS | `integer` |
| `approval_required` | ✅ EXISTS | `boolean` |
| `approval_status` | ✅ EXISTS | `text` |
| `retry_count` | ✅ EXISTS | `integer` |
| `error_code` | ❌ NOT FOUND | Do NOT use in Dispatcher logic |
| `error_message` | ❌ NOT FOUND | Do NOT use in Dispatcher logic |
| `organization_id` | ❌ NOT FOUND | New column (ADD in 06K-B) |
| `department_id` | ❌ NOT FOUND | New column (ADD in 06K-B) |
| `data_classification` | ❌ NOT FOUND | New column (ADD in 06K-B) |
| `requested_by_organization_id` | ❌ NOT FOUND | New column (ADD in 06K-B) |

---

### 2.4 Table: `ai_task_steps`

| Column | Production Status | Data Type (Verified) |
| :--- | :--- | :--- |
| `id` | ✅ EXISTS | `uuid` |
| `task_id` | ✅ EXISTS | `uuid` |
| `message_type` | ✅ EXISTS | `text` (12 canonical HAIP types) |
| `status` | ✅ EXISTS | `text` |
| `envelope` | ✅ EXISTS | `jsonb` |
| `result_payload` | ✅ EXISTS | `jsonb` |
| `error_code` | ✅ EXISTS | `text` |
| `error_message` | ✅ EXISTS | `text` |
| `created_at` | ✅ EXISTS | `timestamptz` |
| `step_index` | ❌ NOT FOUND | — |
| `sender_agent_id` | ❌ NOT FOUND | — |
| `recipient_agent_id` | ❌ NOT FOUND | — |
| `duration_ms` | ❌ NOT FOUND | — |
| `step_name` | ❌ NOT FOUND | Do NOT reference — non-canonical |
| `metadata` | ❌ NOT FOUND | Do NOT reference — non-canonical |
| `organization_id` | ❌ NOT FOUND | New column (ADD in 06K-B) |

> [!IMPORTANT]
> **`ai_task_steps` is service-role/server-only in MVP.** No RLS policy should expose raw execution steps to authenticated org users. The `requested_by_organization_id` on `ai_tasks` does NOT grant cross-org read access to `ai_task_steps`.

---

### 2.5 Table: `ai_outputs`

| Column | Production Status | Data Type (Verified) |
| :--- | :--- | :--- |
| `id` | ✅ EXISTS | `uuid` |
| `task_id` | ✅ EXISTS | `uuid` |
| `artifact_ref` | ✅ EXISTS | `text` |
| `artifact_type` | ✅ EXISTS | `text` |
| `version` | ✅ EXISTS | `text` |
| `qa_status` | ✅ EXISTS | `text` |
| `metadata` | ✅ EXISTS | `jsonb` |
| `created_at` | ✅ EXISTS | `timestamptz` |
| `agent_id` | ❌ NOT FOUND | — |
| `output_type` | ❌ NOT FOUND | Non-canonical — do NOT use |
| `content` | ❌ NOT FOUND | Non-canonical — do NOT use |
| `organization_id` | ❌ NOT FOUND | New column (ADD in 06K-B) |
| `data_classification` | ❌ NOT FOUND | New column (ADD in 06K-B) |
| `release_status` | ❌ NOT FOUND | New column (ADD in 06K-B) |

---

## 3. PGMQ Queue Verification

- **Active Queue:** `ai-jobs` (single queue, CONFIRMED)
- **Ready Messages:** 0
- **Dead-Letter Queue (`ai-jobs-dlq`):** DOES NOT EXIST. Per Phase 06K-A.1 correction, DLQ is removed from design. Failure handling uses visibility timeout, `retry_count`, and task state transitions.

---

## 4. Phase Sequencing (Corrected)

| Phase | Mode | Description |
| :--- | :--- | :--- |
| **06K-A** | Design | Multi-org architecture design documents (completed) |
| **06K-A.1** | Design Correction | Reconciliation against real production schema (this document) |
| **06K-B** | Draft + Dry-Run | Executable migration draft; isolated test-environment dry-run; **NO production apply** |
| **06K-C** | Production Migration | Controlled production apply only after Human Owner approval |
