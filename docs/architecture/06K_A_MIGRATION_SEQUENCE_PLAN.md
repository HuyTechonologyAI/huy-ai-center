# PHASE 06K-A: MIGRATION SEQUENCE PLAN
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-A-MIG-001  
**Phase:** 06K-A (Design Only — Execution Scheduled in Phase 06K-B)  
**System:** HUY AI CENTER / HAIP CONTROL PLANE  
**Target Database:** Supabase `HuyAI` (`bdeluacbzbdflxubhpha`)  
**Author:** Principal AI Infrastructure & Database Engineering  
**Status:** APPROVED DESIGN BASELINE  

---

## 1. Governance Principles & Safety Invariants (D15)

To guarantee 100% production uptime and safeguard existing database assets, all schema evolution in Phase 06K-B MUST obey these cardinal rules:

1. **Strictly Additive**: Never drop, rename, or truncate existing tables, columns, or constraints.
2. **Zero-Downtime Execution**: All new columns on existing high-throughput tables (`ai_tasks`, `ai_task_steps`, `ai_outputs`, `agents`, `agent_versions`) MUST be added as `NULLABLE` or have non-locking safe defaults.
3. **Legacy Preservation**: The 19 legacy tables containing 239 verified production rows (`categories`, `courses`, `lessons`, `profiles`, `system_settings`, etc.) must remain completely untouched.
4. **Independent Idempotence**: Every migration statement MUST use `IF NOT EXISTS` / `IF EXISTS` guards.
5. **Reversibility Guarantee**: A corresponding deterministic Down-Migration script MUST be verified prior to applying forward migrations.

---

## 2. 15-Step Additive Migration Sequence

The execution sequence is structured into 5 logical phases across 15 discrete atomic steps:

```
[Phase 1: Foundation]
  Step 01: Pre-flight baseline validation & lock timeout config
  Step 02: Core Multi-Org Tables (`organizations`, `departments`)
  Step 03: Identity & Access (`organization_memberships`)
  Step 04: Governance Engine (`ai_policies`)

[Phase 2: Agent Registry Extensions]
  Step 05: Extend `public.agents` (org, dept, hierarchy, cost center)
  Step 06: Extend `public.agent_versions` (agent_card JSONB, SHA-256 hash)
  Step 07: Establish Model B Version Pointer (`current_agent_version_id`)

[Phase 3: Operational Pipeline Extensions]
  Step 08: Extend `public.ai_tasks` (multi-org routing & classification)
  Step 09: Extend `public.ai_task_steps` (cross-org sender/recipient trace)
  Step 10: Extend `public.ai_outputs` (org scope, sensitivity, release status)

[Phase 4: Data Initialization]
  Step 11: Seed 6 Canonical Business Organizations
  Step 12: Seed MVP Departments for all 6 Organizations
  Step 13: Seed Baseline Policy Rules (Ceilings & SmartTax Lockdown)

[Phase 5: Security & Verification]
  Step 14: Enable RLS & Deploy Security Definer Helper Functions
  Step 15: Run Post-Migration Verification & Smoke Test Suite
```

---

### Detailed Step-by-Step Specification

#### Step 01: Pre-flight Baseline Validation & Session Configuration
- Verify 34 tables exist and 0 pending uncommitted migrations.
- Set conservative lock timeout: `SET statement_timeout = '15s'; SET lock_timeout = '5s';`.

#### Step 02: Core Multi-Org Tables
- Create `public.organizations` with primary key `id text`, `code`, `cost_center_code`, `parent_org_id`, `data_classification_ceiling`.
- Create `public.departments` with composite uniqueness `UNIQUE(organization_id, code)`.

#### Step 03: Identity & Access
- Create `public.organization_memberships` linking `auth.users(id)` and `public.organizations(id)`.
- Unique constraint: `UNIQUE(organization_id, user_id)`.

#### Step 04: Governance Engine
- Create `public.ai_policies` with check constraints on `policy_scope` and `priority`.

#### Step 05: Extend `public.agents`
- Add columns:
  - `organization_id text REFERENCES public.organizations(id)`
  - `department_id text REFERENCES public.departments(id)`
  - `hierarchy_level integer DEFAULT 1 CHECK (hierarchy_level BETWEEN 0 AND 4)`
  - `cost_center_code text`
- Create index: `idx_agents_org_dept` on `(organization_id, department_id)`.

#### Step 06: Extend `public.agent_versions`
- Add columns:
  - `agent_card jsonb`
  - `agent_card_hash text`
- Create GIN index: `idx_agent_versions_card` on `agent_card jsonb_path_ops`.

#### Step 07: Model B Version Pointer
- Add column to `public.agents`:
  - `current_agent_version_id uuid REFERENCES public.agent_versions(id)`
- Create index: `idx_agents_curr_version` on `(current_agent_version_id)`.

#### Step 08: Extend `public.ai_tasks`
- Add columns:
  - `organization_id text REFERENCES public.organizations(id)`
  - `department_id text REFERENCES public.departments(id)`
  - `data_classification text DEFAULT 'INTERNAL'`
  - `cost_center_code text`
  - `requested_by_organization_id text REFERENCES public.organizations(id)`
- Create composite index: `idx_ai_tasks_org_status_prio` on `(organization_id, status, priority)`.

#### Step 09: Extend `public.ai_task_steps`
- Add columns:
  - `sender_organization_id text REFERENCES public.organizations(id)`
  - `recipient_organization_id text REFERENCES public.organizations(id)`
- Create index: `idx_ai_task_steps_cross_org` on `(task_id, sender_organization_id, recipient_organization_id)`.

#### Step 10: Extend `public.ai_outputs`
- Add columns:
  - `organization_id text REFERENCES public.organizations(id)`
  - `data_classification text DEFAULT 'INTERNAL'`
  - `release_status text DEFAULT 'DRAFT'`
- Create index: `idx_ai_outputs_org_release` on `(organization_id, release_status)`.

#### Step 11: Seed 6 Canonical Organizations
- Insert 6 canonical records:
  - `org-01-huytech` (Holding Group)
  - `org-02-edtech-ai` (EdTech)
  - `org-03-smarttax` (SmartTax)
  - `org-04-legal-gov` (Legal & Governance)
  - `org-05-ecommerce-auto` (E-Commerce)
  - `org-06-media-creative` (Media Studio)

#### Step 12: Seed Initial Departments
- Insert initial core departments for each of the 6 organizations.

#### Step 13: Seed Baseline Policy Rules
- Insert L0 Group Policies (`POL-GRP-001`, `POL-GRP-002`) and SmartTax Isolation Policy (`POL-ST-ISO-001`).

#### Step 14: Enable RLS & Security Policies
- Enable RLS on all 4 new tables + 5 extended tables.
- Deploy `auth_user_organization_ids()`, `auth_user_has_org_role()`, `auth_user_is_group_admin()`.
- Apply RLS policies as specified in `06K_A_POLICY_AND_RLS_MODEL.md`.

#### Step 15: Post-Migration Verification & Health Check
- Run automated verification script confirming:
  - 38 total tables exist (34 original + 4 new).
  - Legacy 19 tables have exactly 239 rows unmodified.
  - Foreign key constraints active and consistent.
  - RLS enabled on all multi-org entities.

---

## 3. Rollback (Down-Migration) Procedure

In the event of an unexpected schema lock or operational anomaly during Phase 06K-B execution, the following reverse procedure restores the database to the 06K-A baseline:

```sql
-- ROLLBACK SCRIPT (Phase 06K-B Undo)
BEGIN;

-- 1. Drop RLS Policies
DROP POLICY IF EXISTS outputs_select_policy ON public.ai_outputs;
DROP POLICY IF EXISTS task_steps_select_policy ON public.ai_task_steps;
DROP POLICY IF EXISTS tasks_select_policy ON public.ai_tasks;
DROP POLICY IF EXISTS agent_versions_select_policy ON public.agent_versions;
DROP POLICY IF EXISTS agents_select_policy ON public.agents;
DROP POLICY IF EXISTS dept_select_policy ON public.departments;
DROP POLICY IF EXISTS org_select_policy ON public.organizations;

-- 2. Drop Security Helper Functions
DROP FUNCTION IF EXISTS public.auth_user_is_group_admin();
DROP FUNCTION IF EXISTS public.auth_user_has_org_role(text, text[]);
DROP FUNCTION IF EXISTS public.auth_user_organization_ids();

-- 3. Remove Extended Columns
ALTER TABLE public.ai_outputs 
  DROP COLUMN IF EXISTS release_status,
  DROP COLUMN IF EXISTS data_classification,
  DROP COLUMN IF EXISTS organization_id;

ALTER TABLE public.ai_task_steps 
  DROP COLUMN IF EXISTS recipient_organization_id,
  DROP COLUMN IF EXISTS sender_organization_id;

ALTER TABLE public.ai_tasks 
  DROP COLUMN IF EXISTS requested_by_organization_id,
  DROP COLUMN IF EXISTS cost_center_code,
  DROP COLUMN IF EXISTS data_classification,
  DROP COLUMN IF EXISTS department_id,
  DROP COLUMN IF EXISTS organization_id;

ALTER TABLE public.agents 
  DROP COLUMN IF EXISTS current_agent_version_id,
  DROP COLUMN IF EXISTS cost_center_code,
  DROP COLUMN IF EXISTS hierarchy_level,
  DROP COLUMN IF EXISTS department_id,
  DROP COLUMN IF EXISTS organization_id;

ALTER TABLE public.agent_versions 
  DROP COLUMN IF EXISTS agent_card_hash,
  DROP COLUMN IF EXISTS agent_card;

-- 4. Drop New Multi-Org Tables
DROP TABLE IF EXISTS public.ai_policies CASCADE;
DROP TABLE IF EXISTS public.organization_memberships CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;

COMMIT;
```
