# PHASE 06K-A.1: POLICY & ROW-LEVEL SECURITY MODEL (RECONCILED)
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-A1-RLS-001  
**Phase:** 06K-A.1 (Design Reconciliation — Zero Database Mutations)  
**Status:** RECONCILED — AUTHORITATIVE FOR PHASE 06K-B  

> **CORRECTION NOTE:** This document supersedes `06K_A_POLICY_AND_RLS_MODEL.md` from Phase 06K-A.  
> Corrections: canonical org IDs, `membership_role` column name, uppercase status values (`'ACTIVE'`), `ai_task_steps` service-only posture, SmartTax cross-org output restriction.

---

## 1. Policy Hierarchy & Resolution (D10 — Unchanged)

### 1.1 Four-Tier Inheritance

```
   ┌────────────────────────────────────────┐
   │             GROUP (L0)                 │  Global ceilings, compliance baselines
   │         (org-01-huytech)               │
   └───────────────────┬────────────────────┘
                       │ inherits & specializes
                       ▼
   ┌────────────────────────────────────────┐
   │          ORGANIZATION (L1)             │  Cost center limits, model allowlists
   │      (e.g., org-03-smarttax)           │
   └───────────────────┬────────────────────┘
                       │ inherits & specializes
                       ▼
   ┌────────────────────────────────────────┐
   │           DEPARTMENT (L2)              │  Operational rules, review thresholds
   └───────────────────┬────────────────────┘
                       │ inherits & specializes
                       ▼
   ┌────────────────────────────────────────┐
   │             AGENT (L3)                 │  Agent Card V2 permissions, tool access
   └────────────────────────────────────────┘
```

Conflict resolution: **Strictest ceiling wins**. Subordinate policies cannot raise data classification or lower risk review requirements above group/org ceilings.

---

## 2. Canonical Organization Topology & Cross-Org Classification (D13)

| Org ID | Org Name | Data Ceiling | Cross-Org Inbound | Cross-Org Outbound |
| :--- | :--- | :--- | :--- | :--- |
| `org-01-huytech` | HUY TECHNOLOGY AI GROUP | `RESTRICTED` | ALLOWED (Supervisory) | ALLOWED (Orchestration) |
| `org-02-aischool` | GVCNCDSAI AI SCHOOL | `CONFIDENTIAL` | RESTRICTED | RESTRICTED |
| `org-03-smarttax` | SMARTTAX AI | `RESTRICTED` | **DENIED BY DEFAULT** | **DENIED BY DEFAULT** |
| `org-04-media-tech` | HUY TECH MEDIA | `INTERNAL` | RESTRICTED | RESTRICTED |
| `org-05-media-edu` | GVCNCDSAI MEDIA | `INTERNAL` | RESTRICTED | RESTRICTED |
| `org-06-media-creative` | HUY CREATIVE MEDIA | `INTERNAL` | RESTRICTED | RESTRICTED |

> [!CAUTION]
> The incorrect org IDs `org-02-edtech-ai`, `org-04-legal-gov`, `org-05-ecommerce-auto` from Phase 06K-A are **removed**. The table above is authoritative.

---

## 3. SmartTax Isolation Protocol ("Tax Vault" Boundary) — D13

### 3.1 Zero Raw-Data Egress Rule

Tasks owned by `org-03-smarttax` with `data_classification IN ('INTERNAL','CONFIDENTIAL','RESTRICTED')`:
- Cannot dispatch outputs or delegate execution to any agent outside `org-03-smarttax`.
- RLS blocks direct joins to other organization's data.

### 3.2 Cross-Org Consumers: Sanitized Output ONLY

> [!IMPORTANT]
> **`requested_by_organization_id` on `ai_tasks` does NOT grant cross-org consumers access to raw tasks or `ai_task_steps`.**  
> Cross-org consumers (e.g. `org-06-media-creative`) may ONLY access `ai_outputs` where:
> - `data_classification = 'PUBLIC'`  
> - `AND release_status = 'PUBLIC_APPROVED'`  
> - `AND organization_id = 'org-03-smarttax'` (explicit SmartTax output)
>
> No other cross-org output access path is permitted.

### 3.3 Sanitized Bridge Flow

```
SmartTax Agent (org-03-smarttax)
  └─► Generates artifact → ai_outputs (data_classification=RESTRICTED, release_status=DRAFT)
        └─► Human Tax Reviewer (membership_role IN ('owner','admin','reviewer') in org-03-smarttax)
              └─► Signs off → Sanitized copy: data_classification=PUBLIC, release_status=PUBLIC_APPROVED
                    └─► org-06-media-creative RLS policy allows SELECT on this record
```

---

## 4. RLS Implementation Design (D11)

### 4.1 RLS Activation

```sql
-- DESIGN ONLY — Execute in Phase 06K-B
ALTER TABLE public.organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_policies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_versions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outputs              ENABLE ROW LEVEL SECURITY;
-- NOTE: ai_task_steps — service-role/server-only in MVP. No authenticated user policy.
```

### 4.2 SECURITY DEFINER Helper Functions

> [!IMPORTANT]
> Column is named **`membership_role`** (not `role`). Status is **`'ACTIVE'`** (uppercase, not `'active'`).

```sql
-- DESIGN ONLY — Execute in Phase 06K-B

-- Helper: Get all organization IDs the current user is ACTIVE in
CREATE OR REPLACE FUNCTION public.auth_user_organization_ids()
RETURNS TABLE (org_id text)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_memberships
  WHERE user_id = auth.uid()
    AND status = 'ACTIVE';     -- uppercase ACTIVE
$$;

-- Helper: Check membership_role in an org
CREATE OR REPLACE FUNCTION public.auth_user_has_org_role(target_org_id text, allowed_roles text[])
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships
    WHERE user_id       = auth.uid()
      AND organization_id = target_org_id
      AND membership_role = ANY(allowed_roles)   -- column is membership_role
      AND status          = 'ACTIVE'              -- uppercase ACTIVE
  );
$$;

-- Helper: Check if user is a group-level admin/owner/auditor
CREATE OR REPLACE FUNCTION public.auth_user_is_group_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships
    WHERE user_id       = auth.uid()
      AND organization_id = 'org-01-huytech'
      AND membership_role IN ('owner','admin','auditor')   -- column is membership_role
      AND status          = 'ACTIVE'                        -- uppercase ACTIVE
  );
$$;
```

---

### 4.3 Table-Specific RLS Policies

#### 4.3.1 `organizations`
```sql
-- SELECT: Members see their own orgs; group admins see all
CREATE POLICY org_select_policy ON public.organizations
FOR SELECT TO authenticated
USING (
    id IN (SELECT auth_user_organization_ids())
    OR auth_user_is_group_admin()
);

-- INSERT/UPDATE/DELETE: org-01-huytech owner/admin only
CREATE POLICY org_write_policy ON public.organizations
FOR ALL TO authenticated
USING (auth_user_has_org_role('org-01-huytech', ARRAY['owner','admin']))
WITH CHECK (auth_user_has_org_role('org-01-huytech', ARRAY['owner','admin']));
```

#### 4.3.2 `departments`
```sql
CREATE POLICY dept_select_policy ON public.departments
FOR SELECT TO authenticated
USING (
    organization_id IN (SELECT auth_user_organization_ids())
    OR auth_user_is_group_admin()
);
```

#### 4.3.3 `agents` & `agent_versions`
```sql
CREATE POLICY agents_select_policy ON public.agents
FOR SELECT TO authenticated
USING (
    organization_id IN (SELECT auth_user_organization_ids())
    OR auth_user_is_group_admin()
);

CREATE POLICY agent_versions_select_policy ON public.agent_versions
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.agents a
        WHERE a.id = agent_versions.agent_id
          AND (
            a.organization_id IN (SELECT auth_user_organization_ids())
            OR auth_user_is_group_admin()
          )
    )
);
```

#### 4.3.4 `ai_tasks`
```sql
CREATE POLICY tasks_select_policy ON public.ai_tasks
FOR SELECT TO authenticated
USING (
    -- Owner org members see their tasks
    organization_id IN (SELECT auth_user_organization_ids())
    -- Group oversight
    OR auth_user_is_group_admin()
    -- NOTE: requested_by_organization_id does NOT grant task or step access
    -- Cross-org consumers may only access public-approved ai_outputs
);
```

#### 4.3.5 `ai_task_steps` — SERVICE-ROLE ONLY (MVP)

> [!IMPORTANT]
> **`ai_task_steps` has NO authenticated-user RLS policy in MVP.**  
> Raw execution traces are service-role/server-only. Only the Dispatcher and background workers write to this table.  
> Enabling RLS on this table with no permissive policy means ALL authenticated queries return 0 rows (safe default-deny). This is the intended MVP posture.

```sql
-- Enable RLS — no permissive user policy = default deny to authenticated users
ALTER TABLE public.ai_task_steps ENABLE ROW LEVEL SECURITY;
-- No CREATE POLICY for authenticated users in MVP.
-- Service role bypasses RLS automatically.
```

#### 4.3.6 `ai_outputs`
```sql
CREATE POLICY outputs_select_policy ON public.ai_outputs
FOR SELECT TO authenticated
USING (
    -- Rule 1: PUBLIC_APPROVED + PUBLIC artifacts are visible to ALL authenticated users
    (release_status = 'PUBLIC_APPROVED' AND data_classification = 'PUBLIC')
    -- Rule 2: Owner org members see their own org's outputs
    OR organization_id IN (SELECT auth_user_organization_ids())
    -- Rule 3: Group admin sees everything EXCEPT raw restricted SmartTax data
    OR (
        auth_user_is_group_admin()
        AND NOT (organization_id = 'org-03-smarttax' AND data_classification = 'RESTRICTED')
    )
);
```

---

## 5. Dispatcher Authorization Model

The Dispatcher (Node.js, service-role credentials) enforces a **Runtime Verification Pipeline** before delegating work to Dell Worker Node:

```
[PGMQ ai-jobs: message received]
         │
         ▼
1. Parse HAIP Envelope V2
         │
         ▼
2. Verify task exists in ai_tasks WHERE id = envelope.telemetry.task_id
   Assert: ai_tasks.organization_id == envelope.routing.organization_id
         │
         ▼
3. Verify agent in agents WHERE id = envelope.identity.agent_id
   Assert: agents.organization_id == ai_tasks.organization_id
   Assert: agents.enabled = TRUE           (use agents.enabled — NOT agents.status)
         │
         ▼
4. Verify version: agents.current_agent_version_id == envelope.identity.agent_version_id
         │
         ▼
5. Classification ceiling check:
   ai_tasks.data_classification <= organizations.data_classification_ceiling
   If organization_id = 'org-03-smarttax': apply hermetic egress lockdown
         │
         ▼
[EXECUTE on Worker Node]
```

**On any invariant failure:**
- Do NOT dispatch
- Write to `ai_task_steps` using `error_code` and `error_message` (verified existing columns)
- Update `ai_tasks.status` = `'FAILED'` (via service-role UPDATE)
- Allow PGMQ visibility timeout to expire naturally (no DLQ)
