-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER V1.2 — COMPLETE RECONCILED DATABASE MIGRATION
-- Target Instance: Supabase Singapore (Project Ref: bdeluacbzbdflxubhpha)
-- Phase: 06G — HAIP Database Reconciliation V1.2
-- Authoritative Safety Rules:
-- 1. Non-destructive: 100% additive, NO DROP TABLE/COLUMN.
-- 2. Zero-Touch: Exactly 0 modifications to 19 existing production tables.
-- 3. Idempotent: Can be run multiple times safely (IF NOT EXISTS, ON CONFLICT).
-- 4. Secure: RLS enabled on all 15 new tables; Owner-Read & Server-Only boundaries.
-- ==============================================================================

-- #############################################################################
-- SECTION 1: AI OPERATIONS MODULE (ai_tasks, ai_task_steps, ai_outputs)
-- Source: 20260920000001_ai_operations.sql
-- #############################################################################

-- 1.1 AI Tasks Table
CREATE TABLE IF NOT EXISTS public.ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    conversation_id UUID NOT NULL,
    parent_task_id UUID REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    idempotency_key TEXT,

    haip_version TEXT NOT NULL DEFAULT '1.0',
    source_app TEXT NOT NULL DEFAULT 'control_center',
    intent TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 5),
    assigned_capability TEXT,
    assigned_agent_id TEXT,

    depends_on UUID[] NOT NULL DEFAULT '{}',
    parallel_group TEXT,
    completion_condition JSONB NOT NULL DEFAULT '{}'::jsonb,

    status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN (
        'CREATED', 'PLANNING', 'QUEUED', 'CLAIMED', 'RUNNING',
        'REVIEWING', 'CORRECTING', 'FINALIZING', 'AWAITING_APPROVAL',
        'APPROVED', 'COMPLETED', 'RETRY_WAIT', 'BLOCKED', 'FAILED',
        'CANCELLED', 'EXPIRED'
    )),

    risk_level INTEGER NOT NULL DEFAULT 0 CHECK (risk_level BETWEEN 0 AND 4),
    risk_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    approval_required BOOLEAN NOT NULL DEFAULT false,
    approval_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED' CHECK (approval_status IN (
        'NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'
    )),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approval_note TEXT,
    CONSTRAINT chk_risk_approval CHECK (risk_level < 3 OR approval_required = true),

    budget_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    estimated_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    actual_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    token_usage JSONB NOT NULL DEFAULT '{"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}'::jsonb,
    runtime_ms INTEGER NOT NULL DEFAULT 0,

    constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
    input_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    input JSONB NOT NULL DEFAULT '{}'::jsonb,
    expected_outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
    output JSONB,

    project_context_ref TEXT,
    task_memory_ref TEXT,

    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    review_cycle INTEGER NOT NULL DEFAULT 0,
    state_version INTEGER NOT NULL DEFAULT 0,
    claimed_by_node_id TEXT,
    expires_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.ai_tasks IS 'Central autonomous task registry, DAG state, risk, budget, and approval management for HAIP/1.0';

CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_tasks_idempotency_key 
    ON public.ai_tasks (idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_tasks_parent_task_id ON public.ai_tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON public.ai_tasks (status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_priority ON public.ai_tasks (priority ASC);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_owner_user_id ON public.ai_tasks (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_conversation_id ON public.ai_tasks (conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_depends_on ON public.ai_tasks USING gin (depends_on);

CREATE INDEX IF NOT EXISTS idx_ai_tasks_queue_poll 
    ON public.ai_tasks (status, priority ASC, created_at ASC)
    WHERE status = 'QUEUED';

-- 1.2 State Machine Validation Trigger
CREATE OR REPLACE FUNCTION public.check_ai_task_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF OLD.status = NEW.status THEN
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    IF OLD.status IN ('COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED') THEN
        RAISE EXCEPTION 'Illegal state transition: Task % is in terminal state % and cannot transition to %',
            OLD.id, OLD.status, NEW.status;
    END IF;

    IF (OLD.status = 'CREATED' AND NEW.status IN ('PLANNING', 'QUEUED', 'CANCELLED')) OR
       (OLD.status = 'PLANNING' AND NEW.status IN ('QUEUED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'QUEUED' AND NEW.status IN ('CLAIMED', 'CANCELLED', 'EXPIRED')) OR
       (OLD.status = 'CLAIMED' AND NEW.status IN ('RUNNING', 'RETRY_WAIT', 'CANCELLED', 'EXPIRED')) OR
       (OLD.status = 'RUNNING' AND NEW.status IN ('REVIEWING', 'RETRY_WAIT', 'BLOCKED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'REVIEWING' AND NEW.status IN ('CORRECTING', 'FINALIZING', 'AWAITING_APPROVAL', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'CORRECTING' AND NEW.status IN ('RUNNING', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'BLOCKED' AND NEW.status IN ('QUEUED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'RETRY_WAIT' AND NEW.status IN ('QUEUED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'AWAITING_APPROVAL' AND NEW.status IN ('APPROVED', 'CORRECTING', 'CANCELLED', 'EXPIRED')) OR
       (OLD.status = 'APPROVED' AND NEW.status IN ('FINALIZING', 'CANCELLED')) OR
       (OLD.status = 'FINALIZING' AND NEW.status IN ('COMPLETED', 'FAILED', 'CANCELLED')) THEN
        
        NEW.state_version := OLD.state_version + 1;
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Illegal state transition: Cannot transition task % from % to %',
            OLD.id, OLD.status, NEW.status;
    END IF;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_tasks_status_transition ON public.ai_tasks;
CREATE TRIGGER trg_ai_tasks_status_transition
    BEFORE UPDATE OF status ON public.ai_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.check_ai_task_status_transition();

-- 1.3 AI Task Steps Table
CREATE TABLE IF NOT EXISTS public.ai_task_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    message_id UUID NOT NULL UNIQUE,
    haip_version TEXT NOT NULL DEFAULT '1.0',
    message_type TEXT NOT NULL CHECK (message_type IN (
        'TASK', 'PLAN', 'CLAIM', 'DELEGATE', 'TOOL_CALL', 'RESULT',
        'REVIEW', 'CORRECTION', 'STATE_UPDATE', 'ERROR',
        'FINAL_CANDIDATE', 'APPROVAL_REQUEST'
    )),
    intent TEXT NOT NULL,
    sender_type TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    recipient_type TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    capability TEXT,
    envelope JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'CREATED',
    attempt INTEGER NOT NULL DEFAULT 1,
    idempotency_key TEXT,
    error_code TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.ai_task_steps IS 'Durable HAIP inter-agent message logs, step traces, and review cycles. Strictly server-only.';

CREATE INDEX IF NOT EXISTS idx_ai_task_steps_task_id ON public.ai_task_steps (task_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_task_steps_msg_type_status ON public.ai_task_steps (message_type, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_task_steps_idempotency_key 
    ON public.ai_task_steps (idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- 1.4 AI Outputs Table
CREATE TABLE IF NOT EXISTS public.ai_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    artifact_ref TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    checksum_sha256 TEXT,
    mime_type TEXT,
    is_final BOOLEAN NOT NULL DEFAULT false,
    confidence NUMERIC(4, 3),
    qa_status TEXT NOT NULL DEFAULT 'pending' CHECK (qa_status IN ('pending', 'passed', 'failed', 'waived')),
    created_by_agent_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_ai_outputs_task_artifact UNIQUE (task_id, artifact_ref, version)
);

COMMENT ON TABLE public.ai_outputs IS 'Verified final and intermediate artifact references. No raw binary files.';

CREATE INDEX IF NOT EXISTS idx_ai_outputs_task ON public.ai_outputs (task_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_artifact_ref ON public.ai_outputs (artifact_ref);

-- 1.5 RLS Policies for AI Operations
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tasks" ON public.ai_tasks;
CREATE POLICY "Users can view own tasks"
    ON public.ai_tasks FOR SELECT TO authenticated
    USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.ai_tasks;
CREATE POLICY "Users can insert own tasks"
    ON public.ai_tasks FOR INSERT TO authenticated
    WITH CHECK (owner_user_id = auth.uid() OR owner_user_id IS NULL);

DROP POLICY IF EXISTS "Service role full access on ai_tasks" ON public.ai_tasks;
CREATE POLICY "Service role full access on ai_tasks"
    ON public.ai_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view steps of own tasks" ON public.ai_task_steps;
DROP POLICY IF EXISTS "Service role full access on ai_task_steps" ON public.ai_task_steps;
CREATE POLICY "Service role full access on ai_task_steps"
    ON public.ai_task_steps FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view outputs of own tasks" ON public.ai_outputs;
CREATE POLICY "Users can view outputs of own tasks"
    ON public.ai_outputs FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ai_tasks t
        WHERE t.id = ai_outputs.task_id
          AND t.owner_user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Service role full access on ai_outputs" ON public.ai_outputs;
CREATE POLICY "Service role full access on ai_outputs"
    ON public.ai_outputs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- #############################################################################
-- SECTION 2: INFRASTRUCTURE MODULE (nodes, node_heartbeats)
-- Source: 20260920000002_infrastructure.sql
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.nodes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hostname TEXT NOT NULL,
    ip_address TEXT,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'draining', 'maintenance', 'error')),
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    specs JSONB DEFAULT '{}'::jsonb,
    max_concurrency INTEGER NOT NULL DEFAULT 2,
    current_load INTEGER NOT NULL DEFAULT 0,
    last_heartbeat_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.nodes IS 'Compute node registry including on-prem Dell Precision M4800 (huy-ai-node-01)';

CREATE INDEX IF NOT EXISTS idx_nodes_status ON public.nodes (status);

CREATE TABLE IF NOT EXISTS public.node_heartbeats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
    cpu_usage_pct NUMERIC(5,2),
    ram_usage_pct NUMERIC(5,2),
    ram_total_mb INTEGER,
    ram_free_mb INTEGER,
    gpu_usage_pct NUMERIC(5,2),
    disk_usage_pct NUMERIC(5,2),
    queue_depth INTEGER DEFAULT 0,
    active_tasks INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'healthy',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.node_heartbeats IS 'Periodic telemetry metrics submitted by worker daemons';

CREATE INDEX IF NOT EXISTS idx_node_heartbeats_node ON public.node_heartbeats (node_id, created_at DESC);

INSERT INTO public.nodes (id, name, hostname, status, capabilities, specs, max_concurrency)
VALUES (
    'huy-ai-node-01',
    'Dell Precision M4800 Primary AI Node',
    'huy-ai-node-01',
    'offline',
    ARRAY['lesson_plan', 'presentation_slides', 'quiz_generator', 'tax_report', 'mock_ai', 'langflow', 'ollama'],
    '{"cpu": "Intel Core i7-4810MQ", "ram_gb": 32, "storage_gb": 1000, "os": "Ubuntu Server 24.04 LTS"}'::jsonb,
    2
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    specs = EXCLUDED.specs,
    capabilities = EXCLUDED.capabilities,
    updated_at = timezone('utc'::text, now());

ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view compute nodes" ON public.nodes;
DROP POLICY IF EXISTS "Authenticated can view node heartbeats" ON public.node_heartbeats;

DROP POLICY IF EXISTS "Service role full access on nodes" ON public.nodes;
CREATE POLICY "Service role full access on nodes"
    ON public.nodes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on node_heartbeats" ON public.node_heartbeats;
CREATE POLICY "Service role full access on node_heartbeats"
    ON public.node_heartbeats FOR ALL TO service_role USING (true) WITH CHECK (true);

-- #############################################################################
-- SECTION 3: AI REGISTRY MODULE (agents, agent_versions, tools, providers, models)
-- Source: 20260920000003_ai_registry.sql
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.ai_providers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider_type TEXT NOT NULL CHECK (provider_type IN ('cloud', 'local', 'hybrid', 'mock')),
    base_url TEXT,
    api_version TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    is_default BOOLEAN NOT NULL DEFAULT false,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.ai_providers IS 'AI upstream services: Google Gemini, Ollama, Groq, Mock Engine';

CREATE TABLE IF NOT EXISTS public.ai_models (
    id TEXT PRIMARY KEY,
    provider_id TEXT NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    context_window INTEGER DEFAULT 8192,
    max_output_tokens INTEGER DEFAULT 4096,
    input_cost_per_million NUMERIC(10, 4) DEFAULT 0.0000,
    output_cost_per_million NUMERIC(10, 4) DEFAULT 0.0000,
    is_active BOOLEAN NOT NULL DEFAULT true,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.ai_models IS 'Catalog of available LLM and SLM models with pricing and capability metadata';

CREATE INDEX IF NOT EXISTS idx_ai_models_provider ON public.ai_models (provider_id);

CREATE TABLE IF NOT EXISTS public.tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN ('slide', 'image', 'video', 'voice', 'llm', 'utility')),
    repository_url TEXT,
    license TEXT,
    default_endpoint TEXT,
    status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('ready', 'connected', 'standby', 'local_only', 'deprecated')),
    recommended_role TEXT,
    supported_inputs TEXT[] NOT NULL DEFAULT '{}',
    output_format TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.tools IS 'Registry of ecosystem open-source AI tools and MCP endpoints';

CREATE TABLE IF NOT EXISTS public.tool_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id TEXT NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    docker_image TEXT,
    config_schema JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tool_version UNIQUE (tool_id, version)
);

COMMENT ON TABLE public.tool_versions IS 'Container versions and configuration schemas for registered tools';

CREATE TABLE IF NOT EXISTS public.tool_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id TEXT NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
    capability_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tool_capability UNIQUE (tool_id, capability_name)
);

CREATE TABLE IF NOT EXISTS public.agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    description TEXT,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    risk_ceiling INTEGER NOT NULL DEFAULT 1 CHECK (risk_ceiling BETWEEN 0 AND 4),
    max_parallel_tasks INTEGER NOT NULL DEFAULT 2,
    enabled BOOLEAN NOT NULL DEFAULT true,
    health_status TEXT NOT NULL DEFAULT 'healthy' CHECK (health_status IN ('healthy', 'degraded', 'offline', 'maintenance')),
    last_seen_at TIMESTAMPTZ,
    active_task_count INTEGER NOT NULL DEFAULT 0,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.agents IS 'Registry of autonomous agents with operational health, risk ceiling, and capabilities';

CREATE INDEX IF NOT EXISTS idx_agents_capabilities ON public.agents USING gin (capabilities);
CREATE INDEX IF NOT EXISTS idx_agents_health_enabled ON public.agents (health_status, enabled);

CREATE TABLE IF NOT EXISTS public.agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    accepted_inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
    output_types JSONB NOT NULL DEFAULT '[]'::jsonb,
    runtime JSONB NOT NULL DEFAULT '{}'::jsonb,
    risk_ceiling INTEGER NOT NULL DEFAULT 1 CHECK (risk_ceiling BETWEEN 0 AND 4),
    max_parallel_tasks INTEGER NOT NULL DEFAULT 2,
    configuration JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    schema_version TEXT NOT NULL DEFAULT '1.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_agent_version UNIQUE (agent_id, version)
);

COMMENT ON TABLE public.agent_versions IS 'Immutable historical versions of Agent Cards and specifications';

CREATE INDEX IF NOT EXISTS idx_agent_versions_capabilities ON public.agent_versions USING gin (capabilities);

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active providers" ON public.ai_providers;
DROP POLICY IF EXISTS "Public can view active models" ON public.ai_models;
DROP POLICY IF EXISTS "Public can view active tools" ON public.tools;
DROP POLICY IF EXISTS "Public can view tool versions" ON public.tool_versions;
DROP POLICY IF EXISTS "Public can view tool capabilities" ON public.tool_capabilities;
DROP POLICY IF EXISTS "Public can view active agents" ON public.agents;
DROP POLICY IF EXISTS "Public can view agent versions" ON public.agent_versions;

DROP POLICY IF EXISTS "Service role full on ai_providers" ON public.ai_providers;
CREATE POLICY "Service role full on ai_providers" ON public.ai_providers FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full on ai_models" ON public.ai_models;
CREATE POLICY "Service role full on ai_models" ON public.ai_models FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full on tools" ON public.tools;
CREATE POLICY "Service role full on tools" ON public.tools FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full on tool_versions" ON public.tool_versions;
CREATE POLICY "Service role full on tool_versions" ON public.tool_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full on tool_capabilities" ON public.tool_capabilities;
CREATE POLICY "Service role full on tool_capabilities" ON public.tool_capabilities FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full on agents" ON public.agents;
CREATE POLICY "Service role full on agents" ON public.agents FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full on agent_versions" ON public.agent_versions;
CREATE POLICY "Service role full on agent_versions" ON public.agent_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- #############################################################################
-- SECTION 4: GITHUB RADAR MODULE (projects, reviews, releases)
-- Source: 20260920000004_github_radar.sql
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.github_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    full_name TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    license TEXT,
    category TEXT NOT NULL CHECK (category IN ('llm_framework', 'rag', 'agent', 'multimodal', 'workflow', 'evaluation')),
    is_monitored BOOLEAN NOT NULL DEFAULT true,
    last_scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.github_projects IS 'Monitored open-source AI repositories scanned for updates and security';

CREATE INDEX IF NOT EXISTS idx_github_projects_category ON public.github_projects (category);
CREATE INDEX IF NOT EXISTS idx_github_projects_monitored ON public.github_projects (is_monitored);

CREATE TABLE IF NOT EXISTS public.github_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.github_projects(id) ON DELETE CASCADE,
    review_score NUMERIC(3, 1),
    security_grade TEXT CHECK (security_grade IN ('A', 'B', 'C', 'D', 'F')),
    architecture_notes TEXT,
    license_risk TEXT CHECK (license_risk IN ('low', 'medium', 'high', 'incompatible')),
    raw_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.github_reviews IS 'Automated code reviews and architectural assessments of monitored projects';

CREATE INDEX IF NOT EXISTS idx_github_reviews_project ON public.github_reviews (project_id);

CREATE TABLE IF NOT EXISTS public.github_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.github_projects(id) ON DELETE CASCADE,
    release_tag TEXT NOT NULL,
    release_title TEXT,
    published_at TIMESTAMPTZ,
    changelog_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_github_project_release UNIQUE (project_id, release_tag)
);

COMMENT ON TABLE public.github_versions IS 'Release tags, changelogs, and version history of monitored repositories';

CREATE INDEX IF NOT EXISTS idx_github_versions_project ON public.github_versions (project_id);

ALTER TABLE public.github_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view github projects" ON public.github_projects;
DROP POLICY IF EXISTS "Authenticated users can view github reviews" ON public.github_reviews;
DROP POLICY IF EXISTS "Authenticated users can view github versions" ON public.github_versions;

DROP POLICY IF EXISTS "Service role full on github_projects" ON public.github_projects;
CREATE POLICY "Service role full on github_projects"
    ON public.github_projects FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full on github_reviews" ON public.github_reviews;
CREATE POLICY "Service role full on github_reviews"
    ON public.github_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full on github_versions" ON public.github_versions;
CREATE POLICY "Service role full on github_versions"
    ON public.github_versions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- #############################################################################
-- SECTION 5: QUEUE & GOVERNANCE MODULE (PGMQ, Secure RPCs, Zero-Touch Audit)
-- Source: 20260920000005_queue_and_governance.sql
-- #############################################################################

CREATE EXTENSION IF NOT EXISTS pgmq;

DO $$
BEGIN
    PERFORM pgmq.create('ai-jobs');
    RAISE NOTICE 'PGMQ durable basic queue ai-jobs verified/created successfully.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice on pgmq.create(ai-jobs): %', SQLERRM;
END $$;

CREATE OR REPLACE FUNCTION public.haip_enqueue_job(
    p_task_id UUID,
    p_message_type TEXT,
    p_envelope JSONB
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
DECLARE
    v_msg_id BIGINT;
BEGIN
    IF (p_envelope ->> 'task_id')::UUID IS DISTINCT FROM p_task_id THEN
        RAISE EXCEPTION 'Mismatched task_id between parameter and HAIP envelope';
    END IF;

    v_msg_id := pgmq.send('ai-jobs', p_envelope);
    RETURN v_msg_id;
END;
$$;

COMMENT ON FUNCTION public.haip_enqueue_job(UUID, TEXT, JSONB) IS 'Secure server-side enqueue RPC for HAIP envelopes';

REVOKE ALL ON FUNCTION public.haip_enqueue_job(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.haip_enqueue_job(UUID, TEXT, JSONB) TO service_role;

CREATE OR REPLACE FUNCTION public.haip_read_jobs(
    p_worker_id TEXT,
    p_batch_size INTEGER DEFAULT 1,
    p_vt INTEGER DEFAULT 30
)
RETURNS TABLE (
    msg_id BIGINT,
    read_ct INTEGER,
    enqueued_at TIMESTAMPTZ,
    vt TIMESTAMPTZ,
    message JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
BEGIN
    RETURN QUERY
    SELECT r.msg_id, r.read_ct, r.enqueued_at, r.vt, r.message
    FROM pgmq.read('ai-jobs', p_vt, p_batch_size) r;
END;
$$;

COMMENT ON FUNCTION public.haip_read_jobs(TEXT, INTEGER, INTEGER) IS 'Secure server-side batch read RPC from ai-jobs queue with visibility timeout';

REVOKE ALL ON FUNCTION public.haip_read_jobs(TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.haip_read_jobs(TEXT, INTEGER, INTEGER) TO service_role;

CREATE OR REPLACE FUNCTION public.haip_archive_job(
    p_msg_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pgmq, pg_temp
AS $$
BEGIN
    RETURN pgmq.archive('ai-jobs', p_msg_id);
END;
$$;

COMMENT ON FUNCTION public.haip_archive_job(BIGINT) IS 'Secure server-side archive RPC for completed HAIP messages';

REVOKE ALL ON FUNCTION public.haip_archive_job(BIGINT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.haip_archive_job(BIGINT) TO service_role;
-- 2.4 Atomic Specific Task Claim Procedure (Claim specific task_id from PGMQ message)
CREATE OR REPLACE FUNCTION public.claim_ai_task(
    p_task_id UUID,
    p_worker_id TEXT,
    p_expected_version INTEGER DEFAULT NULL
)
RETURNS SETOF public.ai_tasks 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Atomically transition the specific task from QUEUED to CLAIMED
    -- Protected by state_version concurrency check
    RETURN QUERY
    UPDATE public.ai_tasks
    SET 
        status = 'CLAIMED',
        claimed_by_node_id = p_worker_id,
        claimed_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_task_id
      AND status = 'QUEUED'
      AND (p_expected_version IS NULL OR state_version = p_expected_version)
    RETURNING *;
END;
$$;

COMMENT ON FUNCTION public.claim_ai_task(UUID, TEXT, INTEGER) IS 'Atomically claims a specific task_id referenced by a PGMQ message with concurrency protection';

REVOKE ALL ON FUNCTION public.claim_ai_task(UUID, TEXT, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_task(UUID, TEXT, INTEGER) TO service_role;

-- ==============================================================================
-- ZERO-TOUCH PRODUCTION AUDIT LOG POLICY:
-- public.audit_logs is 100% UNTOUCHED (Zero DDL executed against legacy tables).
-- All required governance context is stored in existing details JSONB column.
-- ==============================================================================
