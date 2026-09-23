-- ============================================================================
-- PHASE 06K-B: MULTI-ORG MIGRATION DRAFT (001 - FOUNDATION)
-- Document Reference: HAIP-DOC-06K-A1-SCHEMA-001 / Section 12
-- Status: Additive, Idempotent, Safe Dry-Run Draft
-- ============================================================================

-- 1. public.organizations
CREATE TABLE IF NOT EXISTS public.organizations (
    id                          text PRIMARY KEY,
    name                        text NOT NULL,
    code                        text NOT NULL UNIQUE,
    cost_center_code            text NOT NULL UNIQUE,
    role_description            text NOT NULL,
    parent_org_id               text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    status                      text NOT NULL DEFAULT 'ACTIVE'
                                CHECK (status IN ('ACTIVE', 'SUSPENDED', 'ARCHIVED')),
    data_classification_ceiling text NOT NULL DEFAULT 'CONFIDENTIAL'
                                CHECK (data_classification_ceiling IN ('PUBLIC','INTERNAL','CONFIDENTIAL','RESTRICTED')),
    metadata                    jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at                  timestamptz NOT NULL DEFAULT now(),
    updated_at                  timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT chk_no_self_parent CHECK (parent_org_id <> id)
);

-- 2. public.departments
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

-- 3. public.organization_memberships
-- Important: column is membership_role, status is uppercase
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

-- 4. public.ai_policies
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

-- 5. Foundation Indexes
CREATE INDEX IF NOT EXISTS idx_orgs_status ON public.organizations(status);
CREATE INDEX IF NOT EXISTS idx_depts_org_status ON public.departments(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_memberships_user_org ON public.organization_memberships(user_id, organization_id);
