# PHASE 06K-A: POLICY & ROW-LEVEL SECURITY (RLS) MODEL
## HUY TECHNOLOGY AI GROUP — HAIP CONTROL PLANE

**Document ID:** HAIP-DOC-06K-A-RLS-001  
**Phase:** 06K-A (Design Only)  
**System:** HUY AI CENTER / HAIP CONTROL PLANE  
**Author:** Principal AI Architecture & Security  
**Status:** APPROVED DESIGN BASELINE  

---

## 1. Executive Summary

This specification defines the multi-organization governance, policy inheritance hierarchy, and PostgreSQL Row-Level Security (RLS) architecture for the HUY AI CENTER / HAIP Control Plane.

The design enforces:
1. **Multi-Tenant Isolation**: Complete logical partitioning across the 6 canonical business organizations.
2. **SmartTax Boundary Lockdown**: Hermetic isolation of `org-03-smarttax` financial, tax, and accounting data.
3. **Hierarchical Policy Inheritance**: 4-tier policy resolution (`GROUP` → `ORGANIZATION` → `DEPARTMENT` → `AGENT`).
4. **Default-Deny Access Model**: Zero trust baseline; explicit grant via `organization_memberships` and `ai_policies`.
5. **Defense-in-Depth for Automation**: Dual-layer security where RLS protects human/API queries, and Dispatcher enforces task/envelope tenant invariants even when executing with service credentials.

---

## 2. Policy Hierarchy & Resolution Engine (D10)

Policies in HAIP govern resource quotas, risk thresholds, allowed actions, data access classifications, and cross-organization interactions.

### 2.1 Four-Tier Inheritance Model

```
   ┌────────────────────────────────────────┐
   │             GROUP (L0)                 │  Global constraints, baseline security,
   │         (org-01-huytech)               │  risk ceilings, compliance baselines
   └───────────────────┬────────────────────┘
                       │ inherits & specializes
                       ▼
   ┌────────────────────────────────────────┐
   │          ORGANIZATION (L1)             │  Cost centers, data classification ceilings,
   │      (e.g., org-03-smarttax)           │  approved models, external API quotas
   └───────────────────┬────────────────────┘
                       │ inherits & specializes
                       ▼
   ┌────────────────────────────────────────┐
   │           DEPARTMENT (L2)              │  Domain operational rules, review thresholds,
   │    (e.g., dept-st-tax-compliance)      │  internal tool whitelists
   └───────────────────┬────────────────────┘
                       │ inherits & specializes
                       ▼
   ┌────────────────────────────────────────┐
   │             AGENT (L3)                 │  Agent Card V2 specific permissions,
   │    (e.g., agent-st-tax-advisor-01)     │  tool access, model parameters, timeout
   └────────────────────────────────────────┘
```

### 2.2 Conflict Resolution & Evaluation Semantics

When evaluating a policy rule for an agent executing a task:
1. **Rule Specificity**:
   - `AGENT` level policies override `DEPARTMENT` level policies.
   - `DEPARTMENT` level policies override `ORGANIZATION` level policies.
   - `ORGANIZATION` level policies override `GROUP` level policies.
2. **Security & Governance Exceptions (Strictest-Wins)**:
   - **Data Classification Ceiling**: An agent or department policy CANNOT raise data classification above its organization's `data_classification_ceiling`.
   - **Risk Level Ceiling**: If a Group policy mandates human review for `R3` and `R4` risks, subordinate policies CANNOT lower the review requirement to automated.
   - **Cost Tier Ceiling**: Token and budget quotas are strictly bounded by organization and department limits. Subordinate agents cannot exceed allocated pools.
3. **Evaluation Precedence Algorithm**:
   ```typescript
   function resolvePolicy(targetAgentId, targetDeptId, targetOrgId, ruleKey): PolicyRule {
     const agentPolicy = findActivePolicy('AGENT', targetAgentId, ruleKey);
     const deptPolicy = findActivePolicy('DEPARTMENT', targetDeptId, ruleKey);
     const orgPolicy = findActivePolicy('ORGANIZATION', targetOrgId, ruleKey);
     const groupPolicy = findActivePolicy('GROUP', 'org-01-huytech', ruleKey);

     // 1. Evaluate Ceiling Constraints (Hard Invariants)
     const effectiveCeiling = getStrictestCeiling([groupPolicy, orgPolicy, deptPolicy, agentPolicy]);

     // 2. Specificity Fallback
     const effectiveRule = agentPolicy ?? deptPolicy ?? orgPolicy ?? groupPolicy ?? DEFAULT_POLICY[ruleKey];

     return applyCeiling(effectiveRule, effectiveCeiling);
   }
   ```

---

## 3. Cross-Organization Boundary & Isolation Architecture (D13)

### 3.1 Organization Topology & Classification

| Org ID | Org Name | Data Ceiling | Cross-Org Inbound | Cross-Org Outbound |
| :--- | :--- | :--- | :--- | :--- |
| `org-01-huytech` | HUY TECHNOLOGY AI GROUP (Holdings) | `RESTRICTED` | ALLOWED (Supervisory) | ALLOWED (Orchestration) |
| `org-02-edtech-ai` | EdTech AI Solutions | `CONFIDENTIAL` | RESTRICTED | RESTRICTED |
| `org-03-smarttax` | SmartTax AI / Kế Toán Thuế | `RESTRICTED` | **DENIED BY DEFAULT** | **DENIED BY DEFAULT** |
| `org-04-legal-gov` | Legal & Governance AI | `RESTRICTED` | AUDIT ONLY | AUDIT / COMPLIANCE |
| `org-05-ecommerce-auto`| E-Commerce Automation AI | `INTERNAL` | RESTRICTED | RESTRICTED |
| `org-06-media-creative`| Media & Creative AI Studio | `PUBLIC` | RESTRICTED | RESTRICTED |

### 3.2 SmartTax Isolation Protocol (The "Tax Vault" Boundary)

SmartTax (`org-03-smarttax`) manages confidential Vietnamese tax documents, general ledgers, corporate fiscal declarations, and financial statements. Under Vietnamese accounting and data privacy regulations, this data must never leak to marketing or unvetted external systems.

1. **Zero Raw-Data Egress**:
   - Tasks owned by `org-03-smarttax` with `data_classification IN ('INTERNAL', 'CONFIDENTIAL', 'RESTRICTED')` are forbidden from dispatching outputs or delegating execution to any agent outside `org-03-smarttax`.
   - Direct database joins between `org-03-smarttax` financial entities and `org-06-media-creative` campaigns are blocked by RLS.
2. **Sanitized Marketing Bridge (The Single Egress Pipe)**:
   - If `org-06-media-creative` requests tax-related content (e.g., "Tax update flyer for Q3 2026"):
     1. An agent in `org-03-smarttax` generates the informative text.
     2. Output is stored in `ai_outputs` with `organization_id = 'org-03-smarttax'` and `data_classification = 'RESTRICTED'`.
     3. An authorized human Tax Reviewer (`role IN ('owner', 'admin', 'reviewer')` in `org-03-smarttax`) inspects the artifact.
     4. Upon human sign-off, a sanitized copy is emitted with `data_classification = 'PUBLIC'` and `release_status = 'PUBLIC_APPROVED'`.
     5. Only then may `ai_task_steps` record a `DELEGATE` event allowing `org-06-media-creative` to consume the sanitized output.

---

## 4. Row-Level Security (RLS) Implementation Design (D11)

### 4.1 RLS Activation & Default Posture

All multi-org tables have RLS enabled with a default-deny posture:
```sql
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outputs ENABLE ROW LEVEL SECURITY;
```

### 4.2 Helper Security Functions

To avoid recursive RLS evaluations and maximize PostgreSQL query planner performance, security evaluations use `SECURITY DEFINER` helper functions marked `STABLE`.

```sql
-- Helper: Get all organization IDs the current user belongs to
CREATE OR REPLACE FUNCTION public.auth_user_organization_ids()
RETURNS TABLE (org_id text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.organization_memberships
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;

-- Helper: Check if current user has one of the allowed roles in an organization
CREATE OR REPLACE FUNCTION public.auth_user_has_org_role(target_org_id text, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  EXISTS (
    SELECT 1
    FROM public.organization_memberships
    WHERE user_id = auth.uid()
      AND organization_id = target_org_id
      AND role = ANY(allowed_roles)
      AND status = 'active'
  );
$$;

-- Helper: Check if current user is a global group auditor or holding admin
CREATE OR REPLACE FUNCTION public.auth_user_is_group_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  EXISTS (
    SELECT 1
    FROM public.organization_memberships
    WHERE user_id = auth.uid()
      AND organization_id = 'org-01-huytech'
      AND role IN ('owner', 'admin', 'auditor')
      AND status = 'active'
  );
$$;
```

---

### 4.3 Table-Specific RLS Policies

#### 4.3.1 `organizations`
- **SELECT**: Any active user can view organizations they belong to; Group Admins can view all organizations.
  ```sql
  CREATE POLICY org_select_policy ON public.organizations
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT auth_user_organization_ids())
    OR auth_user_is_group_admin()
  );
  ```
- **INSERT / UPDATE / DELETE**: Restrict to `org-01-huytech` owners/admins only.

#### 4.3.2 `departments`
- **SELECT**: Users can view departments within their organizations or if Group Admin.
  ```sql
  CREATE POLICY dept_select_policy ON public.departments
  FOR SELECT TO authenticated
  USING (
    organization_id IN (SELECT auth_user_organization_ids())
    OR auth_user_is_group_admin()
  );
  ```
- **INSERT / UPDATE / DELETE**: Requires `role IN ('owner', 'admin')` within the department's parent organization.

#### 4.3.3 `agents` & `agent_versions`
- **SELECT**:
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
        AND (a.organization_id IN (SELECT auth_user_organization_ids()) OR auth_user_is_group_admin())
    )
  );
  ```
- **INSERT / UPDATE (Agents)**: Requires `admin` or `operator` role in the organization.
- **INSERT (Agent Versions)**: Immutable once created; requires `admin` or `operator`.

#### 4.3.4 `ai_tasks`
- **SELECT**:
  ```sql
  CREATE POLICY tasks_select_policy ON public.ai_tasks
  FOR SELECT TO authenticated
  USING (
    -- User belongs to task owning organization
    organization_id IN (SELECT auth_user_organization_ids())
    -- OR user belongs to the requesting organization (cross-org trace)
    OR (requested_by_organization_id IS NOT NULL AND requested_by_organization_id IN (SELECT auth_user_organization_ids()))
    -- OR group oversight
    OR auth_user_is_group_admin()
  );
  ```
- **INSERT**: User must belong to the submitting organization and have `role IN ('owner', 'admin', 'operator', 'member')`.
- **UPDATE**: Updates restricted to task status/cancellation by operators or task creator.

#### 4.3.5 `ai_task_steps`
- **SELECT**:
  ```sql
  CREATE POLICY task_steps_select_policy ON public.ai_task_steps
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_tasks t
      WHERE t.id = ai_task_steps.task_id
        AND (
          t.organization_id IN (SELECT auth_user_organization_ids())
          OR (t.requested_by_organization_id IS NOT NULL AND t.requested_by_organization_id IN (SELECT auth_user_organization_ids()))
          OR auth_user_is_group_admin()
        )
    )
  );
  ```

#### 4.3.6 `ai_outputs`
- **SELECT**:
  ```sql
  CREATE POLICY outputs_select_policy ON public.ai_outputs
  FOR SELECT TO authenticated
  USING (
    -- Public approved artifacts are visible to all authenticated users
    (release_status = 'PUBLIC_APPROVED' AND data_classification = 'PUBLIC')
    -- Otherwise, restricted to output owning organization
    OR organization_id IN (SELECT auth_user_organization_ids())
    -- Or group administrative oversight (except raw SmartTax restricted data without legal review)
    OR (
      auth_user_is_group_admin()
      AND (organization_id <> 'org-03-smarttax' OR data_classification <> 'RESTRICTED')
    )
  );
  ```

---

## 5. Automation & Dispatcher Authorization Guardrails

While the background Node.js Dispatcher and Dell Worker nodes operate using service-role credentials to interact with PGMQ and Supabase, they MUST NOT execute arbitrary operations.

The Dispatcher enforce the following **Runtime Verification Pipeline**:

```
 [PGMQ ai-jobs Message Received]
              │
              ▼
   Step 1: Parse HAIP Envelope
              │
              ▼
   Step 2: Database Invariant Cross-Check
           - Fetch task from `ai_tasks`
           - Verify envelope.organization_id == task.organization_id
           - Fetch agent from `agents`
           - Verify agent.organization_id == task.organization_id
              │
              ▼
   Step 3: Policy Check
           - Verify task.data_classification <= org.data_classification_ceiling
           - Verify task cost_center matches org/dept
              │
              ▼
   Step 4: Dispatch Execution to Worker Node
```

Any discrepancy between queue envelope claims and database ground truth results in instant **Task Rejection** with `error_code = 'HAIP_TENANT_VIOLATION'` logged to `ai_task_steps`.
