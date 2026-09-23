-- ============================================================================
-- PHASE 06K-B: MULTI-ORG MIGRATION ROLLBACK
-- Document Reference: HAIP-DOC-06K-A1-SCHEMA-001 / Sections 29, 30
-- Target: LOCAL ISOLATED TEST DATABASE ONLY (NEVER PRODUCTION)
-- Rollback Sequence:
--   RLS Policies -> Helper Functions -> Triggers -> Constraints/Indexes ->
--   Extended Columns -> New Tables
-- ============================================================================

-- 1. DROP RLS POLICIES (Added by 06K-B)
DROP POLICY IF EXISTS rls_smarttax_output_boundary ON public.ai_outputs;
DROP POLICY IF EXISTS outputs_org_select_policy ON public.ai_outputs;

DROP POLICY IF EXISTS rls_smarttax_task_boundary ON public.ai_tasks;
DROP POLICY IF EXISTS tasks_org_select_policy ON public.ai_tasks;

DROP POLICY IF EXISTS agent_versions_select_policy ON public.agent_versions;
DROP POLICY IF EXISTS agents_select_policy ON public.agents;

DROP POLICY IF EXISTS policies_select_policy ON public.ai_policies;
DROP POLICY IF EXISTS memberships_select_policy ON public.organization_memberships;

DROP POLICY IF EXISTS dept_select_policy ON public.departments;
DROP POLICY IF EXISTS org_write_policy ON public.organizations;
DROP POLICY IF EXISTS org_select_policy ON public.organizations;

-- 2. DROP HELPER FUNCTIONS
DROP FUNCTION IF EXISTS public.auth_user_organization_ids();
DROP FUNCTION IF EXISTS public.auth_user_has_org_role(text, text[]);
DROP FUNCTION IF EXISTS public.auth_user_is_group_admin();
DROP FUNCTION IF EXISTS public.data_classification_rank(text);

-- 3. DROP TRIGGERS & TRIGGER FUNCTIONS
DROP TRIGGER IF EXISTS trg_agent_versions_immutability ON public.agent_versions;
DROP FUNCTION IF EXISTS public.trg_agent_version_immutable();

DROP TRIGGER IF EXISTS trg_agents_version_invariant ON public.agents;
DROP FUNCTION IF EXISTS public.trg_check_version_belongs_to_agent();

-- 4. DROP ADDED CONSTRAINTS & INDEXES
ALTER TABLE public.agents DROP CONSTRAINT IF EXISTS fk_agents_current_version;

DROP INDEX IF EXISTS public.idx_outputs_org_release;
DROP INDEX IF EXISTS public.idx_tasks_cost_center_created;
DROP INDEX IF EXISTS public.idx_tasks_org_status;
DROP INDEX IF EXISTS public.idx_agents_hierarchy_enabled;
DROP INDEX IF EXISTS public.idx_agents_org_dept_enabled;
DROP INDEX IF EXISTS public.idx_memberships_user_org;
DROP INDEX IF EXISTS public.idx_depts_org_status;
DROP INDEX IF EXISTS public.idx_orgs_status;

-- 5. DROP EXTENDED COLUMNS (Reversing 002 & 003)
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

ALTER TABLE public.agent_versions
    DROP COLUMN IF EXISTS agent_card_hash,
    DROP COLUMN IF EXISTS agent_card;

ALTER TABLE public.agents
    DROP COLUMN IF EXISTS current_agent_version_id,
    DROP COLUMN IF EXISTS cost_center_code,
    DROP COLUMN IF EXISTS hierarchy_level,
    DROP COLUMN IF EXISTS department_id,
    DROP COLUMN IF EXISTS organization_id;

-- 6. DROP NEW TABLES (Reversing 001 & 004 in reverse dependency order)
DROP TABLE IF EXISTS public.ai_policies CASCADE;
DROP TABLE IF EXISTS public.organization_memberships CASCADE;
DROP TABLE IF EXISTS public.departments CASCADE;
DROP TABLE IF EXISTS public.organizations CASCADE;
