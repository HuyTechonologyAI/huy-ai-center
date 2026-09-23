-- ============================================================================
-- PHASE 06K-B: MULTI-ORG MIGRATION DRAFT (005 - SECURITY, RLS & IMMUTABILITY)
-- Document Reference: HAIP-DOC-06K-A1-RLS-001 / Sections 20-24
-- Status: Additive, Idempotent, Safe Dry-Run Draft
-- ============================================================================

-- 1. Enable Row-Level Security on all multi-org and operational tables
ALTER TABLE public.organizations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_policies             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_versions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_steps            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outputs              ENABLE ROW LEVEL SECURITY;

-- 2. Hardened SECURITY DEFINER Helper Functions
-- Fixed search_path = public, pg_temp; execute revoked from PUBLIC
CREATE OR REPLACE FUNCTION public.auth_user_organization_ids()
RETURNS TABLE (org_id text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT organization_id
  FROM public.organization_memberships
  WHERE user_id = (SELECT auth.uid())
    AND status = 'ACTIVE';
$$;

CREATE OR REPLACE FUNCTION public.auth_user_has_org_role(target_org_id text, allowed_roles text[])
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships
    WHERE user_id       = (SELECT auth.uid())
      AND organization_id = target_org_id
      AND membership_role = ANY(allowed_roles)
      AND status          = 'ACTIVE'
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_is_group_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.organization_memberships
    WHERE user_id       = (SELECT auth.uid())
      AND organization_id = 'org-01-huytech'
      AND membership_role IN ('owner','admin','auditor')
      AND status          = 'ACTIVE'
  );
$$;

-- Secure helper ACLs
REVOKE EXECUTE ON FUNCTION public.auth_user_organization_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_organization_ids() TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.auth_user_has_org_role(text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_has_org_role(text, text[]) TO authenticated, service_role;

REVOKE EXECUTE ON FUNCTION public.auth_user_is_group_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_user_is_group_admin() TO authenticated, service_role;

-- 3. Table-Specific RLS Policies

-- 3.1 public.organizations
DROP POLICY IF EXISTS org_select_policy ON public.organizations;
CREATE POLICY org_select_policy ON public.organizations
FOR SELECT TO authenticated
USING (
    id IN (SELECT auth_user_organization_ids())
    OR auth_user_is_group_admin()
);

DROP POLICY IF EXISTS org_write_policy ON public.organizations;
CREATE POLICY org_write_policy ON public.organizations
FOR ALL TO authenticated
USING (auth_user_has_org_role('org-01-huytech', ARRAY['owner','admin']))
WITH CHECK (auth_user_has_org_role('org-01-huytech', ARRAY['owner','admin']));

-- 3.2 public.departments
DROP POLICY IF EXISTS dept_select_policy ON public.departments;
CREATE POLICY dept_select_policy ON public.departments
FOR SELECT TO authenticated
USING (
    organization_id IN (SELECT auth_user_organization_ids())
    OR auth_user_is_group_admin()
);

-- 3.3 public.organization_memberships (Default-Deny Mutation for Authenticated)
DROP POLICY IF EXISTS memberships_select_policy ON public.organization_memberships;
CREATE POLICY memberships_select_policy ON public.organization_memberships
FOR SELECT TO authenticated
USING (
    user_id = (SELECT auth.uid())
    OR auth_user_is_group_admin()
);

-- 3.4 public.ai_policies (Default-Deny Mutation for Authenticated)
DROP POLICY IF EXISTS policies_select_policy ON public.ai_policies;
CREATE POLICY policies_select_policy ON public.ai_policies
FOR SELECT TO authenticated
USING (
    status = 'ACTIVE'
    OR auth_user_is_group_admin()
);

-- 3.5 public.agents & agent_versions
DROP POLICY IF EXISTS agents_select_policy ON public.agents;
CREATE POLICY agents_select_policy ON public.agents
FOR SELECT TO authenticated
USING (
    organization_id IN (SELECT auth_user_organization_ids())
    OR auth_user_is_group_admin()
);

DROP POLICY IF EXISTS agent_versions_select_policy ON public.agent_versions;
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

-- 3.6 public.ai_tasks (Permissive Org / Group Access + RESTRICTIVE SmartTax Boundary)
-- Note: Existing "Users can view own tasks" policy is preserved for legacy user compatibility.
DROP POLICY IF EXISTS tasks_org_select_policy ON public.ai_tasks;
CREATE POLICY tasks_org_select_policy ON public.ai_tasks
FOR SELECT TO authenticated
USING (
    organization_id IN (SELECT auth_user_organization_ids())
    OR auth_user_is_group_admin()
);

-- SmartTax Strictest-Wins RESTRICTIVE boundary:
-- Outside users (including group admins) CANNOT select SmartTax tasks unless actively member of org-03-smarttax
DROP POLICY IF EXISTS rls_smarttax_task_boundary ON public.ai_tasks;
CREATE POLICY rls_smarttax_task_boundary ON public.ai_tasks
AS RESTRICTIVE
FOR SELECT TO authenticated
USING (
    organization_id IS NULL
    OR organization_id <> 'org-03-smarttax'
    OR 'org-03-smarttax' IN (SELECT auth_user_organization_ids())
);

-- 3.7 public.ai_outputs (Permissive Org / Public Access + RESTRICTIVE SmartTax Boundary)
-- Note: Existing "Users can view outputs of own tasks" policy is preserved for legacy user compatibility.
DROP POLICY IF EXISTS outputs_org_select_policy ON public.ai_outputs;
CREATE POLICY outputs_org_select_policy ON public.ai_outputs
FOR SELECT TO authenticated
USING (
    (release_status = 'PUBLIC_APPROVED' AND data_classification = 'PUBLIC')
    OR organization_id IN (SELECT auth_user_organization_ids())
    OR auth_user_is_group_admin()
);

-- SmartTax Strictest-Wins RESTRICTIVE output boundary:
-- Outside users (including group admins) CAN ONLY access SmartTax outputs if PUBLIC_APPROVED and PUBLIC
DROP POLICY IF EXISTS rls_smarttax_output_boundary ON public.ai_outputs;
CREATE POLICY rls_smarttax_output_boundary ON public.ai_outputs
AS RESTRICTIVE
FOR SELECT TO authenticated
USING (
    organization_id IS NULL
    OR organization_id <> 'org-03-smarttax'
    OR (release_status = 'PUBLIC_APPROVED' AND data_classification = 'PUBLIC')
    OR 'org-03-smarttax' IN (SELECT auth_user_organization_ids())
);

-- 3.8 public.ai_task_steps (Service-Role Only in MVP)
-- Explicit posture: Zero permissive policies for authenticated or anon.
-- Service-role bypasses RLS automatically. All authenticated queries return 0 rows.
