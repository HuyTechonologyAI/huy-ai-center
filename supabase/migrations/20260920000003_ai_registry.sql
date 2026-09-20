-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20260920000003_ai_registry.sql
-- Architecture: V1.2 (HAIP/1.0 Multi-Agent Orchestration Platform)
-- Module: AI Registry (agents, agent_versions, tools, providers, models)
-- Target: HuyAI Singapore (bdeluacbzbdflxubhpha)
-- Rules: Non-destructive, 100% additive, Idempotent, RLS enabled, Server-Only.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. AI PROVIDERS TABLE
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 2. AI MODELS TABLE
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 3. AI TOOLS TABLE
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 4. TOOL VERSIONS TABLE
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 5. TOOL CAPABILITIES TABLE
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.tool_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id TEXT NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
    capability_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tool_capability UNIQUE (tool_id, capability_name)
);

-- -----------------------------------------------------------------------------
-- 6. AGENTS TABLE (HAIP Agent Card V1 Stable Identity & Operational State)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 7. AGENT VERSIONS TABLE (Immutable Agent Card Version Snapshots)
-- -----------------------------------------------------------------------------
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

-- -----------------------------------------------------------------------------
-- 8. REGISTRY SEEDS (PURGED — ZERO SPECULATIVE SEEDS)
-- -----------------------------------------------------------------------------
-- All registry tables are created empty without speculative seed rows.
-- Agent, tool, and model entries are added exclusively via admin governance or reviewed migrations.

-- -----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) POLICIES — SERVER-ONLY
-- -----------------------------------------------------------------------------
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;

-- Clean state: Drop any client/public policies
DROP POLICY IF EXISTS "Public can view active providers" ON public.ai_providers;
DROP POLICY IF EXISTS "Public can view active models" ON public.ai_models;
DROP POLICY IF EXISTS "Public can view active tools" ON public.tools;
DROP POLICY IF EXISTS "Public can view tool versions" ON public.tool_versions;
DROP POLICY IF EXISTS "Public can view tool capabilities" ON public.tool_capabilities;
DROP POLICY IF EXISTS "Public can view active agents" ON public.agents;
DROP POLICY IF EXISTS "Public can view agent versions" ON public.agent_versions;

-- Service Role full access exclusively
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
