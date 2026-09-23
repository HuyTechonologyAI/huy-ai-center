-- ============================================================================
-- PHASE 06K-B: MULTI-ORG MIGRATION DRAFT (002 - AGENT REGISTRY EXTENSIONS)
-- Document Reference: HAIP-DOC-06K-A1-SCHEMA-001 / Sections 13, 14, 15, 26
-- Status: Additive, Idempotent, Safe Dry-Run Draft
-- ============================================================================

-- 1. Extend public.agents
ALTER TABLE public.agents
    ADD COLUMN IF NOT EXISTS organization_id          text REFERENCES public.organizations(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS department_id            text REFERENCES public.departments(id)   ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS hierarchy_level          smallint DEFAULT 1 CHECK (hierarchy_level BETWEEN 0 AND 4),
    ADD COLUMN IF NOT EXISTS cost_center_code         text,
    ADD COLUMN IF NOT EXISTS current_agent_version_id uuid;

-- 2. Extend public.agent_versions
ALTER TABLE public.agent_versions
    ADD COLUMN IF NOT EXISTS agent_card      jsonb,
    ADD COLUMN IF NOT EXISTS agent_card_hash text;

-- 3. Ensure uq_agent_version constraint exists idempotently
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.agent_versions'::regclass
          AND conname = 'uq_agent_version'
    ) THEN
        ALTER TABLE public.agent_versions
            ADD CONSTRAINT uq_agent_version UNIQUE (agent_id, version);
    END IF;
END $$;

-- 4. Foreign Key for current_agent_version_id (guarded)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.agents'::regclass
          AND conname = 'fk_agents_current_version'
    ) THEN
        ALTER TABLE public.agents
            ADD CONSTRAINT fk_agents_current_version
            FOREIGN KEY (current_agent_version_id)
            REFERENCES public.agent_versions(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 5. Version Pointer Invariant Trigger
-- Enforces: agent_versions.agent_id = agents.id
CREATE OR REPLACE FUNCTION public.trg_check_version_belongs_to_agent()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'public.agents'::regclass
          AND tgname = 'trg_agents_version_invariant'
    ) THEN
        CREATE TRIGGER trg_agents_version_invariant
        BEFORE INSERT OR UPDATE OF current_agent_version_id ON public.agents
        FOR EACH ROW EXECUTE FUNCTION public.trg_check_version_belongs_to_agent();
    END IF;
END $$;

-- 6. Agent Version Immutability Protection
-- An existing agent_versions row must not allow UPDATE or DELETE
CREATE OR REPLACE FUNCTION public.trg_agent_version_immutable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION 'agent_versions records are immutable and cannot be updated or deleted (id: %)',
        COALESCE(OLD.id, NEW.id);
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgrelid = 'public.agent_versions'::regclass
          AND tgname = 'trg_agent_versions_immutability'
    ) THEN
        CREATE TRIGGER trg_agent_versions_immutability
        BEFORE UPDATE OR DELETE ON public.agent_versions
        FOR EACH ROW EXECUTE FUNCTION public.trg_agent_version_immutable();
    END IF;
END $$;

-- 7. Agent Registry Indexes
CREATE INDEX IF NOT EXISTS idx_agents_org_dept_enabled ON public.agents(organization_id, department_id, enabled);
CREATE INDEX IF NOT EXISTS idx_agents_hierarchy_enabled ON public.agents(hierarchy_level, enabled);
