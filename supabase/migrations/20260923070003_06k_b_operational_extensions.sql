-- ============================================================================
-- PHASE 06K-B: MULTI-ORG MIGRATION DRAFT (003 - OPERATIONAL EXTENSIONS)
-- Document Reference: HAIP-DOC-06K-A1-SCHEMA-001 / Sections 16, 17, 26
-- Status: Additive, Idempotent, Safe Dry-Run Draft
-- ============================================================================

-- 1. Extend public.ai_tasks
ALTER TABLE public.ai_tasks
    ADD COLUMN IF NOT EXISTS organization_id               text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS department_id                 text REFERENCES public.departments(id)   ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS data_classification           text DEFAULT 'INTERNAL'
                             CHECK (data_classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    ADD COLUMN IF NOT EXISTS cost_center_code              text,
    ADD COLUMN IF NOT EXISTS requested_by_organization_id  text REFERENCES public.organizations(id) ON DELETE SET NULL;

-- 2. Extend public.ai_task_steps
ALTER TABLE public.ai_task_steps
    ADD COLUMN IF NOT EXISTS sender_organization_id    text,
    ADD COLUMN IF NOT EXISTS recipient_organization_id text;

-- 3. Extend public.ai_outputs
ALTER TABLE public.ai_outputs
    ADD COLUMN IF NOT EXISTS organization_id      text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS data_classification  text DEFAULT 'INTERNAL'
                             CHECK (data_classification IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    ADD COLUMN IF NOT EXISTS release_status       text DEFAULT 'DRAFT'
                             CHECK (release_status IN ('DRAFT','QA_APPROVED','PUBLIC_APPROVED','REVOKED'));

-- 4. Deterministic Data Classification Rank Function
-- Evaluates security ceilings mathematically rather than lexicographically:
-- PUBLIC (1) < INTERNAL (2) < CONFIDENTIAL (3) < RESTRICTED (4)
CREATE OR REPLACE FUNCTION public.data_classification_rank(cls text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
  SELECT CASE cls
    WHEN 'PUBLIC' THEN 1
    WHEN 'INTERNAL' THEN 2
    WHEN 'CONFIDENTIAL' THEN 3
    WHEN 'RESTRICTED' THEN 4
    ELSE 0
  END;
$$;

-- 5. Operational Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_org_status ON public.ai_tasks(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_cost_center_created ON public.ai_tasks(cost_center_code, created_at);
CREATE INDEX IF NOT EXISTS idx_outputs_org_release ON public.ai_outputs(organization_id, release_status);
