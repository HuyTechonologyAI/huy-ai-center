# PHASE 06K-A.1: MIGRATION SEQUENCE PLAN (RECONCILED)
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-A1-MIG-001  
**Phase:** 06K-A.1 (Design Reconciliation — Zero Database Mutations)  
**Status:** RECONCILED — AUTHORITATIVE FOR PHASE 06K-B DRAFT  

> **CORRECTION NOTE:** This document supersedes `06K_A_MIGRATION_SEQUENCE_PLAN.md` from Phase 06K-A.  
> Corrections: `agents.enabled` (not `agents.status`), `membership_role` column, uppercase status, verified column names, phase sequencing (06K-B = Draft+DryRun only, 06K-C = Production).

---

## 1. Governance & Safety Principles

1. **Strictly Additive**: No DROP, RENAME, or TRUNCATE of existing tables or columns
2. **Zero-Downtime**: All new columns on existing tables are `NULLABLE` or have safe defaults
3. **Legacy Preservation**: 19 legacy tables with their verified row counts remain ZERO-TOUCH
4. **Idempotent**: Every DDL statement uses `IF NOT EXISTS` / `IF EXISTS`
5. **Reversible**: Down-migration script verified before any forward migration applies
6. **Phase Boundary**: Phase 06K-B = Draft + isolated dry-run. Phase 06K-C = Production apply after Human approval

---

## 2. 15-Step Migration Sequence (Corrected)

```
[Phase 1: Foundation Tables]
  Step 01: Pre-flight validation — confirm 34 tables, zero pending DDL
  Step 02: CREATE public.organizations
  Step 03: CREATE public.departments
  Step 04: CREATE public.organization_memberships  (column: membership_role)
  Step 05: CREATE public.ai_policies

[Phase 2: Agent Registry Extensions]
  Step 06: ALTER agents — ADD organization_id, department_id, hierarchy_level, cost_center_code
  Step 07: ALTER agent_versions — ADD agent_card, agent_card_hash; ADD UNIQUE(agent_id, version)
  Step 08: ALTER agents — ADD current_agent_version_id; ADD FK constraint + invariant trigger

[Phase 3: Operational Pipeline Extensions]
  Step 09: ALTER ai_tasks — ADD organization_id, department_id, data_classification, cost_center_code, requested_by_organization_id
  Step 10: ALTER ai_task_steps — ADD sender_organization_id, recipient_organization_id
  Step 11: ALTER ai_outputs — ADD organization_id, data_classification, release_status

[Phase 4: Data Seeding]
  Step 12: INSERT 6 canonical organizations
  Step 13: INSERT initial departments
  Step 14: INSERT baseline ai_policies (Group ceiling + SmartTax isolation)

[Phase 5: Security Layer]
  Step 15: Enable RLS + SECURITY DEFINER helpers + RLS policies; verify ai_task_steps service-only
```

---

## 3. Key Per-Step Specification (Corrected Column References)

### Step 04: `public.organization_memberships`
```sql
-- Uses membership_role, UPPERCASE status values
CREATE TABLE IF NOT EXISTS public.organization_memberships (
    id              uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid    NOT NULL REFERENCES auth.users(id)         ON DELETE CASCADE,
    organization_id text    NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    membership_role text    NOT NULL
                    CHECK (membership_role IN ('owner','admin','reviewer','operator','member','auditor')),
    department_id   text    REFERENCES public.departments(id) ON DELETE SET NULL,
    is_primary      boolean NOT NULL DEFAULT false,
    status          text    NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE','INVITED','SUSPENDED','REVOKED')),
    permissions     jsonb   NOT NULL DEFAULT '[]'::jsonb,
    metadata        jsonb   NOT NULL DEFAULT '{}'::jsonb,
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_org UNIQUE (user_id, organization_id)
);
```

### Step 06: Extend `public.agents`
```sql
-- Verified existing columns: id(text), name, description, capabilities, configuration,
-- risk_ceiling(integer), enabled(boolean), health_status, max_parallel_tasks, created_at, updated_at
-- DO NOT reference: agents.status (NOT FOUND), agents.runtime (NOT FOUND)
ALTER TABLE public.agents
    ADD COLUMN IF NOT EXISTS organization_id          text      REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS department_id            text      REFERENCES public.departments(id)   ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS hierarchy_level          smallint  DEFAULT 1 CHECK (hierarchy_level BETWEEN 0 AND 4),
    ADD COLUMN IF NOT EXISTS cost_center_code         text;
```

### Step 08: Version Pointer + Invariant Trigger
```sql
ALTER TABLE public.agents
    ADD COLUMN IF NOT EXISTS current_agent_version_id uuid;

-- FK constraint (add after agent_versions has data)
ALTER TABLE public.agents
    ADD CONSTRAINT fk_agents_current_version
    FOREIGN KEY (current_agent_version_id) REFERENCES public.agent_versions(id) ON DELETE RESTRICT;

-- Cross-column invariant: version must belong to the same agent
CREATE OR REPLACE FUNCTION public.trg_check_version_belongs_to_agent()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.current_agent_version_id IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.agent_versions av
            WHERE av.id = NEW.current_agent_version_id
              AND av.agent_id = NEW.id
        ) THEN
            RAISE EXCEPTION 'current_agent_version_id % does not belong to agent %',
                NEW.current_agent_version_id, NEW.id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_agents_version_invariant
BEFORE INSERT OR UPDATE OF current_agent_version_id ON public.agents
FOR EACH ROW EXECUTE FUNCTION public.trg_check_version_belongs_to_agent();
```

### Step 09: Extend `public.ai_tasks`
```sql
-- Verified existing: id(uuid), assigned_agent_id(text), risk_level(integer), status, priority,
-- approval_required, approval_status, retry_count
-- NOT FOUND: ai_tasks.error_code, ai_tasks.error_message — do NOT add or reference
ALTER TABLE public.ai_tasks
    ADD COLUMN IF NOT EXISTS organization_id              text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS department_id                text REFERENCES public.departments(id)   ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS data_classification          text DEFAULT 'INTERNAL'
                             CHECK (data_classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    ADD COLUMN IF NOT EXISTS cost_center_code             text,
    ADD COLUMN IF NOT EXISTS requested_by_organization_id text REFERENCES public.organizations(id) ON DELETE SET NULL;
```

### Step 10: Extend `public.ai_task_steps`
```sql
-- Verified existing: id, task_id, message_type, status, envelope(jsonb), result_payload(jsonb),
-- error_code, error_message, created_at
-- NOT FOUND: step_name, metadata, step_index, sender_agent_id, recipient_agent_id, duration_ms
ALTER TABLE public.ai_task_steps
    ADD COLUMN IF NOT EXISTS sender_organization_id    text,
    ADD COLUMN IF NOT EXISTS recipient_organization_id text;
```

### Step 11: Extend `public.ai_outputs`
```sql
-- Verified existing: id, task_id, artifact_ref, artifact_type, version, qa_status, metadata(jsonb), created_at
-- NOT FOUND: output_type, content, agent_id — do NOT reference
ALTER TABLE public.ai_outputs
    ADD COLUMN IF NOT EXISTS organization_id     text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS data_classification text DEFAULT 'INTERNAL'
                             CHECK (data_classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    ADD COLUMN IF NOT EXISTS release_status      text DEFAULT 'DRAFT'
                             CHECK (release_status IN ('DRAFT','QA_APPROVED','PUBLIC_APPROVED','REVOKED'));
```

### Step 15: RLS Activation
```sql
-- Enable RLS on multi-org tables
ALTER TABLE public.organizations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_policies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_versions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outputs               ENABLE ROW LEVEL SECURITY;

-- ai_task_steps: enable RLS but no permissive authenticated policy (service-role only in MVP)
ALTER TABLE public.ai_task_steps            ENABLE ROW LEVEL SECURITY;
-- (No CREATE POLICY for authenticated users on ai_task_steps in MVP)

-- Deploy SECURITY DEFINER helpers (uses membership_role, UPPERCASE ACTIVE)
-- See 06K_A_POLICY_AND_RLS_MODEL.md Section 4.2 for full function bodies
```

---

## 4. Post-Migration Verification (Step 15)

```javascript
// Verify: 38 tables exist (34 original + 4 new)
// Verify: Legacy 19 tables unchanged
// Verify: agents.enabled (boolean) accessible — NOT agents.status
// Verify: ai_task_steps: authenticated user query returns 0 rows (RLS service-only confirmed)
// Verify: organization_memberships uses membership_role column
// Verify: 6 canonical organizations seeded
// Verify: PGMQ ai-jobs queue = 1 (no DLQ created)
```

---

## 5. Rollback (Down-Migration)

```sql
BEGIN;

-- 1. Drop RLS Policies (authenticated)
DROP POLICY IF EXISTS outputs_select_policy          ON public.ai_outputs;
DROP POLICY IF EXISTS tasks_select_policy            ON public.ai_tasks;
DROP POLICY IF EXISTS agent_versions_select_policy   ON public.agent_versions;
DROP POLICY IF EXISTS agents_select_policy           ON public.agents;
DROP POLICY IF EXISTS dept_select_policy             ON public.departments;
DROP POLICY IF EXISTS org_select_policy              ON public.organizations;

-- 2. Drop Triggers and Functions
DROP TRIGGER IF EXISTS trg_agents_version_invariant ON public.agents;
DROP FUNCTION IF EXISTS public.trg_check_version_belongs_to_agent();
DROP FUNCTION IF EXISTS public.auth_user_is_group_admin();
DROP FUNCTION IF EXISTS public.auth_user_has_org_role(text, text[]);
DROP FUNCTION IF EXISTS public.auth_user_organization_ids();

-- 3. Drop Extended Columns (existing tables)
ALTER TABLE public.ai_outputs      DROP COLUMN IF EXISTS release_status,
                                   DROP COLUMN IF EXISTS data_classification,
                                   DROP COLUMN IF EXISTS organization_id;

ALTER TABLE public.ai_task_steps   DROP COLUMN IF EXISTS recipient_organization_id,
                                   DROP COLUMN IF EXISTS sender_organization_id;

ALTER TABLE public.ai_tasks        DROP COLUMN IF EXISTS requested_by_organization_id,
                                   DROP COLUMN IF EXISTS cost_center_code,
                                   DROP COLUMN IF EXISTS data_classification,
                                   DROP COLUMN IF EXISTS department_id,
                                   DROP COLUMN IF EXISTS organization_id;

ALTER TABLE public.agents          DROP CONSTRAINT IF EXISTS fk_agents_current_version,
                                   DROP COLUMN IF EXISTS current_agent_version_id,
                                   DROP COLUMN IF EXISTS cost_center_code,
                                   DROP COLUMN IF EXISTS hierarchy_level,
                                   DROP COLUMN IF EXISTS department_id,
                                   DROP COLUMN IF EXISTS organization_id;

ALTER TABLE public.agent_versions  DROP CONSTRAINT IF EXISTS uq_agent_version,
                                   DROP COLUMN IF EXISTS agent_card_hash,
                                   DROP COLUMN IF EXISTS agent_card;

-- 4. Drop New Tables
DROP TABLE IF EXISTS public.ai_policies              CASCADE;
DROP TABLE IF EXISTS public.organization_memberships CASCADE;
DROP TABLE IF EXISTS public.departments              CASCADE;
DROP TABLE IF EXISTS public.organizations            CASCADE;

COMMIT;
```
