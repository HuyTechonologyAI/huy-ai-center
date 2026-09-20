-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20260920000003_ai_registry.sql
-- Module: AI Registry (agents, tools, providers, models)
-- Target: HuyAI Singapore (bdeluacbzbdflxubhpha)
-- Rules: Non-destructive, 100% additive, Idempotent, RLS enabled.
-- ==============================================================================

-- 1. AI Providers Table
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

-- 2. AI Models Table
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

-- 3. AI Tools Table (14 Audited Open-Source Tools)
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

-- 4. Tool Versions Table
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

-- 5. Tool Capabilities Table
CREATE TABLE IF NOT EXISTS public.tool_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tool_id TEXT NOT NULL REFERENCES public.tools(id) ON DELETE CASCADE,
    capability_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_tool_capability UNIQUE (tool_id, capability_name)
);

-- 6. Agents Table (High-level Persona & System Prompts)
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

-- 7. Agent Versions Table
CREATE TABLE IF NOT EXISTS public.agent_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_id TEXT NOT NULL REFERENCES public.agents(id) ON DELETE CASCADE,
    version TEXT NOT NULL,
    system_prompt TEXT NOT NULL,
    tools JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_agent_version UNIQUE (agent_id, version)
);

-- 8. REGISTRY SEEDS (PURGED PER PHASE 06C)
-- Registry tables are created empty without speculative seed rows.
-- Model/tool/provider/agent catalog entries will be introduced via reviewed catalog migrations or admin UI.

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.ai_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tool_capabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_versions ENABLE ROW LEVEL SECURITY;

-- Public / Authenticated read-only access to active registry items
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

-- Service role full access on all registry tables
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
