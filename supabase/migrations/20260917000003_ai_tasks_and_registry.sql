-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — AI TASKS & AI REGISTRY SCHEMA MIGRATION
-- Migration: 20260917000003_ai_tasks_and_registry.sql
-- Description: AI Task Queue (ai_tasks, ai_task_steps, ai_outputs) 
--              and AI Registry (providers, models, tools, tool_versions, 
--              capabilities, agents, agent_versions).
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. AI REGISTRY (Providers, Models, Tools, Agents)
-- -----------------------------------------------------------------------------

-- 1.1 AI Providers
CREATE TABLE IF NOT EXISTS public.ai_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    base_url TEXT,
    is_local BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.ai_providers IS 'AI execution backends (Ollama, LiteLLM, Gemini, OpenAI, Groq)';

-- 1.2 AI Models
CREATE TABLE IF NOT EXISTS public.ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.ai_providers(id) ON DELETE CASCADE,
    model_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    context_window INTEGER NOT NULL DEFAULT 8192,
    input_cost_per_million NUMERIC(10, 4) NOT NULL DEFAULT 0,
    output_cost_per_million NUMERIC(10, 4) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_provider_model UNIQUE (provider_id, model_name)
);

COMMENT ON TABLE public.ai_models IS 'Catalog of available models and cost rates';

-- 1.3 Tools
CREATE TABLE IF NOT EXISTS public.tools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'function' CHECK (type IN ('function', 'api', 'retriever', 'bash', 'python', 'custom')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.tools IS 'Function calling tool registry';

-- 1.4 Tool Versions
CREATE TABLE IF NOT EXISTS public.tool_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    parameters_schema JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_deprecated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tool_version UNIQUE (tool_id, version)
);

COMMENT ON TABLE public.tool_versions IS 'Versioned parameter schemas for tools';

-- 1.5 Tool Capabilities
CREATE TABLE IF NOT EXISTS public.tool_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id UUID NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
    capability_code TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tool_capability UNIQUE (tool_id, capability_code)
);

COMMENT ON TABLE public.tool_capabilities IS 'Granular capabilities mapped to tools';

-- 1.6 Agents
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'custom' CHECK (role IN ('orchestrator', 'rag_specialist', 'code_generator', 'tax_auditor', 'teacher_assistant', 'data_analyst', 'custom')),
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.agents IS 'Agent definitions for multi-agent workflows';

-- 1.7 Agent Versions
CREATE TABLE IF NOT EXISTS public.agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id UUID NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    default_model_id UUID REFERENCES public.ai_models(id) ON DELETE SET NULL,
    temperature NUMERIC(3, 2) NOT NULL DEFAULT 0.70 CHECK (temperature >= 0 AND temperature <= 2),
    tools_config JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_agent_version UNIQUE (agent_id, version)
);

COMMENT ON TABLE public.agent_versions IS 'Versioned prompts and configurations for agents';

-- -----------------------------------------------------------------------------
-- 2. AI TASKS (Multi-Tenant Task Queue & Pipeline Execution)
-- -----------------------------------------------------------------------------

-- If ai_tasks already exists from 01, we ensure columns match contracts or upgrade
CREATE TABLE IF NOT EXISTS public.ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    source_app TEXT NOT NULL CHECK (source_app IN ('huycncdsai', 'gvcncdsai', 'smarttax_ai', 'control_center', 'external_api')),
    task_type TEXT NOT NULL CHECK (task_type IN ('llm_inference', 'rag_query', 'workflow_automation', 'model_training', 'agent_execution')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    claimed_by_worker_id TEXT,
    claimed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.ai_tasks IS 'Central multi-tenant task queue for all AI execution requests';

CREATE INDEX IF NOT EXISTS idx_ai_tasks_tenant ON public.ai_tasks (organization_id, profile_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_poll_v2 ON public.ai_tasks (status, priority DESC, created_at ASC) WHERE status = 'queued';

-- 2.2 AI Task Steps
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
    CONSTRAINT uq_task_step UNIQUE (task_id, step_number)
);

COMMENT ON TABLE public.ai_task_steps IS 'Individual pipeline steps for complex agent and workflow tasks';

CREATE INDEX IF NOT EXISTS idx_task_steps_task ON public.ai_task_steps (task_id, step_number ASC);

-- 2.3 AI Outputs
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

COMMENT ON TABLE public.ai_outputs IS 'Structured results, token usage metrics, and latency of AI executions';

CREATE INDEX IF NOT EXISTS idx_ai_outputs_task ON public.ai_outputs (task_id);

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outputs ENABLE ROW LEVEL SECURITY;

-- Registry tables: Public / Authenticated read-only
DROP POLICY IF EXISTS "Public can view active providers" ON public.ai_providers;
CREATE POLICY "Public can view active providers" ON public.ai_providers FOR SELECT TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active models" ON public.ai_models;
CREATE POLICY "Public can view active models" ON public.ai_models FOR SELECT TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "Public can view active tools" ON public.tools;
CREATE POLICY "Public can view active tools" ON public.tools FOR SELECT TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "Public can view tool versions" ON public.tool_versions;
CREATE POLICY "Public can view tool versions" ON public.tool_versions FOR SELECT TO authenticated, anon USING (is_deprecated = false);

DROP POLICY IF EXISTS "Public can view tool capabilities" ON public.tool_capabilities;
CREATE POLICY "Public can view tool capabilities" ON public.tool_capabilities FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS "Public can view active agents" ON public.agents;
CREATE POLICY "Public can view active agents" ON public.agents FOR SELECT TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS "Public can view agent versions" ON public.agent_versions;
CREATE POLICY "Public can view agent versions" ON public.agent_versions FOR SELECT TO authenticated, anon USING (true);

-- AI Tasks: Users can view their own tasks or their organization tasks
DROP POLICY IF EXISTS "Users can view own or org tasks" ON public.ai_tasks;
CREATE POLICY "Users can view own or org tasks"
    ON public.ai_tasks FOR SELECT TO authenticated
    USING (
        profile_id = auth.uid() OR
        (organization_id IS NOT NULL AND public.is_org_member(organization_id))
    );

DROP POLICY IF EXISTS "Users can insert tasks for own or org" ON public.ai_tasks;
CREATE POLICY "Users can insert tasks for own or org"
    ON public.ai_tasks FOR INSERT TO authenticated
    WITH CHECK (
        profile_id = auth.uid() OR
        (organization_id IS NOT NULL AND public.is_org_member(organization_id))
    );

-- Task steps & Outputs: Inherit read permission from parent task
DROP POLICY IF EXISTS "Users can view task steps of own tasks" ON public.ai_task_steps;
CREATE POLICY "Users can view task steps of own tasks"
    ON public.ai_task_steps FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ai_tasks t
        WHERE t.id = ai_task_steps.task_id
          AND (t.profile_id = auth.uid() OR (t.organization_id IS NOT NULL AND public.is_org_member(t.organization_id)))
    ));

DROP POLICY IF EXISTS "Users can view outputs of own tasks" ON public.ai_outputs;
CREATE POLICY "Users can view outputs of own tasks"
    ON public.ai_outputs FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ai_tasks t
        WHERE t.id = ai_outputs.task_id
          AND (t.profile_id = auth.uid() OR (t.organization_id IS NOT NULL AND public.is_org_member(t.organization_id)))
    ));

-- Full access for service_role
DROP POLICY IF EXISTS "Service role full on ai_providers" ON public.ai_providers;
CREATE POLICY "Service role full on ai_providers" ON public.ai_providers FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full on ai_models" ON public.ai_models;
CREATE POLICY "Service role full on ai_models" ON public.ai_models FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full on tools" ON public.tools;
CREATE POLICY "Service role full on tools" ON public.tools FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full on tool_versions" ON public.tool_versions;
CREATE POLICY "Service role full on tool_versions" ON public.tool_versions FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full on tool_capabilities" ON public.tool_capabilities;
CREATE POLICY "Service role full on tool_capabilities" ON public.tool_capabilities FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full on agents" ON public.agents;
CREATE POLICY "Service role full on agents" ON public.agents FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full on agent_versions" ON public.agent_versions;
CREATE POLICY "Service role full on agent_versions" ON public.agent_versions FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full on ai_tasks" ON public.ai_tasks;
CREATE POLICY "Service role full on ai_tasks" ON public.ai_tasks FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full on ai_task_steps" ON public.ai_task_steps;
CREATE POLICY "Service role full on ai_task_steps" ON public.ai_task_steps FOR ALL TO service_role USING (true);

DROP POLICY IF EXISTS "Service role full on ai_outputs" ON public.ai_outputs;
CREATE POLICY "Service role full on ai_outputs" ON public.ai_outputs FOR ALL TO service_role USING (true);

