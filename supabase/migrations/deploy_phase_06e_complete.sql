-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER V1.1 — COMPLETE CONTROLLED PRODUCTION MIGRATION
-- Target Instance: Supabase Singapore (Project Ref: bdeluacbzbdflxubhpha)
-- Phase: 06E — Controlled Production Migration Apply
-- Authoritative Safety Rules:
-- 1. Non-destructive: 100% additive, NO DROP TABLE/COLUMN.
-- 2. Zero-Touch: Exactly 0 modifications to 19 existing production tables.
-- 3. Idempotent: Can be run multiple times safely (IF NOT EXISTS, ON CONFLICT).
-- 4. Secure: RLS enabled on all 15 new tables with explicit policies.
-- ==============================================================================

-- #############################################################################
-- SECTION 1: AI OPERATIONS MODULE (ai_tasks, ai_task_steps, ai_outputs)
-- Source: 20260920000001_ai_operations.sql
-- #############################################################################

-- 1.1 AI Tasks Table (Central Asynchronous Job Pipeline)
CREATE TABLE IF NOT EXISTS public.ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_app TEXT NOT NULL CHECK (source_app IN ('education', 'tax', 'control_center', 'external_api', 'huycncdsai', 'gvcncdsai', 'smarttax_ai')),
    task_type TEXT NOT NULL CHECK (task_type IN ('lesson_plan', 'presentation_slides', 'quiz_generator', 'tax_report', 'rag_query', 'custom_workflow', 'llm_inference', 'workflow_automation', 'model_training')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'running', 'completed', 'failed', 'cancelled', 'timeout')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    input JSONB DEFAULT '{}'::jsonb,
    result JSONB,
    output JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    organization_id UUID,
    claimed_by_node_id TEXT,
    claimed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.ai_tasks IS 'Central decoupled asynchronous AI execution jobs across all ecosystem apps';

CREATE INDEX IF NOT EXISTS idx_ai_tasks_queue_poll 
    ON public.ai_tasks (status, priority DESC, created_at ASC)
    WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_ai_tasks_user_id ON public.ai_tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_user_email ON public.ai_tasks (user_email);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_source_app ON public.ai_tasks (source_app, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_claimed_node ON public.ai_tasks (claimed_by_node_id, status);

-- 1.2 AI Task Steps Table (Granular Execution Pipeline)
CREATE TABLE IF NOT EXISTS public.ai_task_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    input JSONB DEFAULT '{}'::jsonb,
    output JSONB,
    error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_task_step UNIQUE (task_id, step_number)
);

COMMENT ON TABLE public.ai_task_steps IS 'Individual pipeline steps for complex agent and multi-turn workflows';

CREATE INDEX IF NOT EXISTS idx_ai_task_steps_task ON public.ai_task_steps (task_id, step_number ASC);

-- 1.3 AI Outputs Table (Structured Results & Token Telemetry)
CREATE TABLE IF NOT EXISTS public.ai_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    text TEXT,
    json JSONB,
    model TEXT,
    tokens_prompt INTEGER DEFAULT 0,
    tokens_completion INTEGER DEFAULT 0,
    tokens_total INTEGER DEFAULT 0,
    latency_ms INTEGER,
    finish_reason TEXT,
    error TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.ai_outputs IS 'Structured output payload, token consumption metrics, and latency logs';

CREATE INDEX IF NOT EXISTS idx_ai_outputs_task ON public.ai_outputs (task_id);

-- 1.4 RLS for AI Operations
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tasks" ON public.ai_tasks;
CREATE POLICY "Users can view own tasks"
    ON public.ai_tasks FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR user_email = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.ai_tasks;
CREATE POLICY "Users can insert own tasks"
    ON public.ai_tasks FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can view steps of own tasks" ON public.ai_task_steps;
CREATE POLICY "Users can view steps of own tasks"
    ON public.ai_task_steps FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ai_tasks t
        WHERE t.id = ai_task_steps.task_id
          AND (t.user_id = auth.uid() OR t.user_email = (auth.jwt() ->> 'email'))
    ));

DROP POLICY IF EXISTS "Users can view outputs of own tasks" ON public.ai_outputs;
CREATE POLICY "Users can view outputs of own tasks"
    ON public.ai_outputs FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ai_tasks t
        WHERE t.id = ai_outputs.task_id
          AND (t.user_id = auth.uid() OR t.user_email = (auth.jwt() ->> 'email'))
    ));

DROP POLICY IF EXISTS "Service role full access on ai_tasks" ON public.ai_tasks;
CREATE POLICY "Service role full access on ai_tasks"
    ON public.ai_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on ai_task_steps" ON public.ai_task_steps;
CREATE POLICY "Service role full access on ai_task_steps"
    ON public.ai_task_steps FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on ai_outputs" ON public.ai_outputs;
CREATE POLICY "Service role full access on ai_outputs"
    ON public.ai_outputs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- #############################################################################
-- SECTION 2: INFRASTRUCTURE MODULE (nodes, node_heartbeats)
-- Source: 20260920000002_infrastructure.sql
-- #############################################################################

-- 2.1 Nodes Table
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

-- 2.2 Node Heartbeats Table
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

-- 2.3 Seed Primary Infrastructure Node (Dell Precision M4800)
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

-- 2.4 RLS for Infrastructure
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_heartbeats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view compute nodes" ON public.nodes;
CREATE POLICY "Authenticated can view compute nodes"
    ON public.nodes FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Authenticated can view node heartbeats" ON public.node_heartbeats;
CREATE POLICY "Authenticated can view node heartbeats"
    ON public.node_heartbeats FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Service role full access on nodes" ON public.nodes;
CREATE POLICY "Service role full access on nodes"
    ON public.nodes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on node_heartbeats" ON public.node_heartbeats;
CREATE POLICY "Service role full access on node_heartbeats"
    ON public.node_heartbeats FOR ALL TO service_role USING (true) WITH CHECK (true);

-- #############################################################################
-- SECTION 3: AI REGISTRY MODULE (providers, models, tools, agents)
-- Source: 20260920000003_ai_registry.sql
-- #############################################################################

-- 3.1 AI Providers
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

-- 3.2 AI Models
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

-- 3.3 AI Tools
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

COMMENT ON TABLE public.tools IS 'Registry of 14 ecosystem open-source AI tools';

-- 3.4 Tool Versions
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

-- 3.5 Tool Capabilities
CREATE TABLE IF NOT EXISTS public.tool_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id TEXT NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
    capability_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tool_capability UNIQUE (tool_id, capability_name)
);

-- 3.6 Agents Table
CREATE TABLE IF NOT EXISTS public.agents (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    system_prompt_template TEXT,
    default_model_id TEXT REFERENCES public.ai_models(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.agents IS 'Configured autonomous personas: Teacher AI, Student AI, SmartTax AI, Business AI';

-- 3.7 Agent Versions Table
CREATE TABLE IF NOT EXISTS public.agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_agent_version UNIQUE (agent_id, version)
);

-- 3.8 RLS for AI Registry
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view active providers" ON public.ai_providers;
CREATE POLICY "Public can view active providers" ON public.ai_providers FOR SELECT TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active models" ON public.ai_models;
CREATE POLICY "Public can view active models" ON public.ai_models FOR SELECT TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active tools" ON public.tools;
CREATE POLICY "Public can view active tools" ON public.tools FOR SELECT TO authenticated, anon USING (status != 'deprecated');

DROP POLICY IF EXISTS "Public can view tool versions" ON public.tool_versions;
CREATE POLICY "Public can view tool versions" ON public.tool_versions FOR SELECT TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "Public can view tool capabilities" ON public.tool_capabilities;
CREATE POLICY "Public can view tool capabilities" ON public.tool_capabilities FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Public can view active agents" ON public.agents;
CREATE POLICY "Public can view active agents" ON public.agents FOR SELECT TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "Public can view agent versions" ON public.agent_versions;
CREATE POLICY "Public can view agent versions" ON public.agent_versions FOR SELECT TO authenticated, anon USING (true);

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
-- SECTION 4: GITHUB RADAR MODULE (projects, reviews, versions)
-- Source: 20260920000004_github_radar.sql
-- #############################################################################

-- 4.1 GitHub Monitored Projects
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

-- 4.2 GitHub Project Reviews
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

-- 4.3 GitHub Project Versions
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

-- 4.4 RLS for GitHub Radar (Server-only, Service-Role only)
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
-- SECTION 5: QUEUE & GOVERNANCE MODULE (PGMQ, claim_ai_task)
-- Source: 20260920000005_queue_and_governance.sql
-- #############################################################################

-- 5.1 Enable pgmq extension
CREATE EXTENSION IF NOT EXISTS pgmq;

-- 5.2 Create primary queue: ai-jobs as a Durable Basic Queue (logged)
DO $$
BEGIN
    PERFORM pgmq.create('ai-jobs');
    RAISE NOTICE 'PGMQ durable basic queue ai-jobs verified/created successfully.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice on pgmq.create(ai-jobs): %', SQLERRM;
END $$;

-- 5.3 Atomic AI Tasks Claim Procedure
CREATE OR REPLACE FUNCTION public.claim_ai_task(p_worker_id TEXT)
RETURNS SETOF public.ai_tasks 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_task_id UUID;
BEGIN
    SELECT id INTO v_task_id
    FROM public.ai_tasks
    WHERE status = 'queued'
    ORDER BY 
        CASE priority 
            WHEN 'urgent' THEN 1
            WHEN 'high' THEN 2
            WHEN 'normal' THEN 3
            WHEN 'low' THEN 4
            ELSE 5 
        END ASC,
        created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_task_id IS NOT NULL THEN
        RETURN QUERY
        UPDATE public.ai_tasks
        SET 
            status = 'claimed',
            claimed_by_node_id = p_worker_id,
            claimed_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_task_id
        RETURNING *;
    END IF;
    RETURN;
END;
$$;

COMMENT ON FUNCTION public.claim_ai_task(TEXT) IS 'Atomic claim function for Dell Precision M4800 worker nodes';

-- ==============================================================================
-- ZERO-TOUCH PRODUCTION AUDIT LOG POLICY:
-- public.audit_logs is 100% UNTOUCHED (Zero DDL executed against legacy tables).
-- All required governance context is stored in existing details JSONB column.
-- ==============================================================================
