# PHASE 06K-A.1: MULTI-ORG SCHEMA DESIGN (RECONCILED)
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-A1-SCHEMA-001  
**Phase:** 06K-A.1 (Design Reconciliation — Zero Database Mutations)  
**Status:** RECONCILED — AUTHORITATIVE FOR PHASE 06K-B  

> **CORRECTION NOTE:** This document supersedes `06K_A_MULTI_ORG_SCHEMA_DESIGN.md` from Phase 06K-A.  
> All type corrections, noncanonical column removals, and org ID fixes are applied.

---

## 1. CANONICAL ORGANIZATIONS (6, FROZEN)

Exactly 6 canonical Business Units — no others:

| Org ID | Display Name | Cost Center | Data Ceiling | Parent |
| :--- | :--- | :--- | :--- | :--- |
| `org-01-huytech` | HUY TECHNOLOGY AI GROUP | `CC-01-HUYTECH` | `RESTRICTED` | `NULL` (root) |
| `org-02-aischool` | GVCNCDSAI AI SCHOOL | `CC-02-AISCHOOL` | `CONFIDENTIAL` | `org-01-huytech` |
| `org-03-smarttax` | SMARTTAX AI | `CC-03-SMARTTAX` | `RESTRICTED` | `org-01-huytech` |
| `org-04-media-tech` | HUY TECH MEDIA | `CC-04-MEDIA-TECH` | `INTERNAL` | `org-01-huytech` |
| `org-05-media-edu` | GVCNCDSAI MEDIA | `CC-05-MEDIA-EDU` | `INTERNAL` | `org-01-huytech` |
| `org-06-media-creative` | HUY CREATIVE MEDIA | `CC-06-MEDIA-CREATIVE` | `INTERNAL` | `org-01-huytech` |

> [!CAUTION]
> Org IDs `org-02-edtech-ai`, `org-04-legal-gov`, `org-05-ecommerce-auto` were **incorrect** in Phase 06K-A. These are removed. The canonical set above is frozen and authoritative.

---

## 2. NEW TABLES (Pseudo-DDL — Execute in Phase 06K-B)

### 2.1 `public.organizations`
```sql
-- DESIGN ONLY — Execute in Phase 06K-B
CREATE TABLE IF NOT EXISTS public.organizations (
    id                        text PRIMARY KEY,
    name                      text NOT NULL,
    code                      text NOT NULL UNIQUE,
    cost_center_code          text NOT NULL UNIQUE,
    role_description          text NOT NULL,
    parent_org_id             text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    status                    text NOT NULL DEFAULT 'ACTIVE'
                              CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    data_classification_ceiling text NOT NULL DEFAULT 'CONFIDENTIAL'
                              CHECK (data_classification_ceiling IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    metadata                  jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at                timestamptz NOT NULL DEFAULT now(),
    updated_at                timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_no_self_parent CHECK (parent_org_id <> id)
);
```

### 2.2 `public.departments`
```sql
-- DESIGN ONLY — Execute in Phase 06K-B
CREATE TABLE IF NOT EXISTS public.departments (
    id                    text PRIMARY KEY,
    organization_id       text NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    code                  text NOT NULL,
    name                  text NOT NULL,
    description           text,
    parent_department_id  text REFERENCES public.departments(id) ON DELETE RESTRICT,
    status                text NOT NULL DEFAULT 'ACTIVE'
                          CHECK (status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
    cost_center_subcode   text,
    metadata              jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at            timestamptz NOT NULL DEFAULT now(),
    updated_at            timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_dept_org_code UNIQUE (organization_id, code),
    CONSTRAINT chk_no_self_parent_dept CHECK (parent_department_id <> id)
);
```

### 2.3 `public.organization_memberships`

> [!IMPORTANT]
> The role column is named **`membership_role`** (not `role`). Status values are **uppercase** (`'ACTIVE'`, not `'active'`).

```sql
-- DESIGN ONLY — Execute in Phase 06K-B
CREATE TABLE IF NOT EXISTS public.organization_memberships (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id   text NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
    membership_role   text NOT NULL
                      CHECK (membership_role IN ('owner','admin','reviewer','operator','member','auditor')),
    department_id     text REFERENCES public.departments(id) ON DELETE SET NULL,
    is_primary        boolean NOT NULL DEFAULT false,
    status            text NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('ACTIVE','INVITED','SUSPENDED','REVOKED')),
    permissions       jsonb NOT NULL DEFAULT '[]'::jsonb,
    metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT uq_user_org UNIQUE (user_id, organization_id)
);
```

### 2.4 `public.ai_policies`
```sql
-- DESIGN ONLY — Execute in Phase 06K-B
CREATE TABLE IF NOT EXISTS public.ai_policies (
    id            text PRIMARY KEY,
    name          text NOT NULL,
    policy_scope  text NOT NULL CHECK (policy_scope IN ('GROUP','ORGANIZATION','DEPARTMENT','AGENT')),
    target_id     text NOT NULL,
    rules         jsonb NOT NULL,
    priority      integer NOT NULL DEFAULT 100,
    status        text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','DISABLED')),
    metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now()
);
```

---

## 3. EXTENSIONS TO EXISTING TABLES (Additive Only — Execute in Phase 06K-B)

### 3.1 Extend `public.agents`

**Verified existing columns:** `id (text)`, `name`, `description`, `capabilities`, `configuration`, `risk_ceiling (integer)`, `enabled (boolean)`, `health_status`, `max_parallel_tasks`, `created_at`, `updated_at`

> [!IMPORTANT]
> `agents.id` is `text`. `agents.risk_ceiling` is `integer`. `agents.status` does NOT exist — use `agents.enabled` and `agents.health_status`.

```sql
-- DESIGN ONLY — Execute in Phase 06K-B
ALTER TABLE public.agents
    ADD COLUMN IF NOT EXISTS organization_id          text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS department_id            text REFERENCES public.departments(id)   ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS hierarchy_level          smallint DEFAULT 1 CHECK (hierarchy_level BETWEEN 0 AND 4),
    ADD COLUMN IF NOT EXISTS cost_center_code         text,
    ADD COLUMN IF NOT EXISTS current_agent_version_id uuid;

-- Version pointer FK (add after agent_versions seeded)
ALTER TABLE public.agents
    ADD CONSTRAINT fk_agents_current_version
    FOREIGN KEY (current_agent_version_id)
    REFERENCES public.agent_versions(id) ON DELETE RESTRICT;
```

**Version Pointer Invariant (Model B):**  
`current_agent_version_id` must reference a version whose `agent_id` equals the owning `agents.id`. This cross-column invariant cannot be expressed as a simple FK. Enforcement strategy:

```sql
-- DESIGN ONLY — Trigger to enforce cross-column invariant
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

---

### 3.2 Extend `public.agent_versions`

**Verified existing columns:** `id (uuid)`, `agent_id (text)`, `version`, `capabilities`, `accepted_inputs`, `output_types`, `runtime`, `risk_ceiling (integer)`, `max_parallel_tasks`, `configuration`, `metadata`, `schema_version`, `created_at`

```sql
-- DESIGN ONLY — Execute in Phase 06K-B
ALTER TABLE public.agent_versions
    ADD COLUMN IF NOT EXISTS agent_card      jsonb,
    ADD COLUMN IF NOT EXISTS agent_card_hash text;

ALTER TABLE public.agent_versions
    ADD CONSTRAINT uq_agent_version UNIQUE (agent_id, version);
```

---

### 3.3 Extend `public.ai_tasks`

**Verified existing columns:** `id (uuid)`, `assigned_agent_id (text)`, `risk_level (integer)`, `status`, `priority`, `approval_required`, `approval_status`, `retry_count`

> [!IMPORTANT]
> `ai_tasks.assigned_agent_id` is `text` (matches `agents.id text`).  
> `ai_tasks.risk_level` is `integer` (0–4). Do NOT use string `"R2"` format in SQL — integer only.  
> `ai_tasks.error_code` and `ai_tasks.error_message` do **NOT** exist. Do not reference them.

```sql
-- DESIGN ONLY — Execute in Phase 06K-B
ALTER TABLE public.ai_tasks
    ADD COLUMN IF NOT EXISTS organization_id               text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS department_id                 text REFERENCES public.departments(id)   ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS data_classification           text DEFAULT 'INTERNAL'
                             CHECK (data_classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    ADD COLUMN IF NOT EXISTS cost_center_code              text,
    ADD COLUMN IF NOT EXISTS requested_by_organization_id  text REFERENCES public.organizations(id) ON DELETE SET NULL;
```

---

### 3.4 Extend `public.ai_task_steps`

**Verified existing columns:** `id (uuid)`, `task_id (uuid)`, `message_type`, `status`, `envelope (jsonb)`, `result_payload (jsonb)`, `error_code`, `error_message`, `created_at`

> [!IMPORTANT]
> `ai_task_steps.step_name` and `ai_task_steps.metadata` do **NOT** exist. Do not reference them.  
> `ai_task_steps.step_index`, `sender_agent_id`, `recipient_agent_id`, `duration_ms` also do NOT exist.  
> In MVP: `ai_task_steps` is **service-role / server-only**. No RLS policy grants authenticated org users direct step access.

```sql
-- DESIGN ONLY — Execute in Phase 06K-B
-- Cross-org audit trace columns (non-blocking, nullable)
ALTER TABLE public.ai_task_steps
    ADD COLUMN IF NOT EXISTS sender_organization_id    text,
    ADD COLUMN IF NOT EXISTS recipient_organization_id text;
```

---

### 3.5 Extend `public.ai_outputs`

**Verified existing columns:** `id (uuid)`, `task_id (uuid)`, `artifact_ref`, `artifact_type`, `version`, `qa_status`, `metadata (jsonb)`, `created_at`

> [!IMPORTANT]
> `ai_outputs.output_type` and `ai_outputs.content` do **NOT** exist — do not use them.  
> `ai_outputs.agent_id` does **NOT** exist.  
> The actual core fields are: `artifact_ref`, `artifact_type`, `version`, `qa_status`, `metadata`.

```sql
-- DESIGN ONLY — Execute in Phase 06K-B
ALTER TABLE public.ai_outputs
    ADD COLUMN IF NOT EXISTS organization_id      text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS data_classification  text DEFAULT 'INTERNAL'
                             CHECK (data_classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    ADD COLUMN IF NOT EXISTS release_status       text DEFAULT 'DRAFT'
                             CHECK (release_status IN ('DRAFT','QA_APPROVED','PUBLIC_APPROVED','REVOKED'));
```

---

## 4. ON DELETE POLICY MATRIX

| Relationship | PK Table | FK Column | ON DELETE | Rationale |
| :--- | :--- | :--- | :--- | :--- |
| Org → Dept | `organizations.id` | `departments.organization_id` | `RESTRICT` | Cannot delete BU with active departments |
| Org → Agent | `organizations.id` | `agents.organization_id` | `RESTRICT` | Agents tied to BU liability/budget |
| Org → Task | `organizations.id` | `ai_tasks.organization_id` | `RESTRICT` | Audit records are immutable |
| Dept → Agent | `departments.id` | `agents.department_id` | `RESTRICT` | Reassign before dissolving dept |
| Dept → Task | `departments.id` | `ai_tasks.department_id` | `SET NULL` | Task stays under org if dept restructured |
| User → Membership | `auth.users.id` | `memberships.user_id` | `CASCADE` | Auth deletion removes memberships |
| Agent → Version | `agents.id` | `agent_versions.agent_id` | `RESTRICT` | Version history is immutable audit log |
| Agent → Current Version | `agent_versions.id` | `agents.current_agent_version_id` | `RESTRICT` | Pointer must remain valid |

---

## 5. DISPATCHER INDEX DESIGN

All indexes reference **verified existing columns** only:

```sql
-- DESIGN ONLY — Execute in Phase 06K-B
-- Org lookups
CREATE INDEX idx_orgs_status ON public.organizations(status);
CREATE INDEX idx_depts_org_status ON public.departments(organization_id, status);
CREATE INDEX idx_memberships_user_org ON public.organization_memberships(user_id, organization_id);

-- Agent dispatch (uses verified columns: enabled, hierarchy_level [new])
CREATE INDEX idx_agents_org_dept_enabled ON public.agents(organization_id, department_id, enabled);
CREATE INDEX idx_agents_hierarchy_enabled ON public.agents(hierarchy_level, enabled);

-- Agent Card V2 lookup
CREATE UNIQUE INDEX idx_agent_versions_lookup ON public.agent_versions(agent_id, version);

-- Task routing (uses verified columns: status, priority, organization_id [new])
CREATE INDEX idx_tasks_org_status ON public.ai_tasks(organization_id, status);
CREATE INDEX idx_tasks_cost_center_created ON public.ai_tasks(cost_center_code, created_at);

-- Output release gate
CREATE INDEX idx_outputs_org_release ON public.ai_outputs(organization_id, release_status);
```
