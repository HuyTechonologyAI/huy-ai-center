-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20260920000002_infrastructure.sql
-- Architecture: V1.2 (HAIP/1.0 Multi-Agent Orchestration Platform)
-- Module: Infrastructure (nodes, node_heartbeats)
-- Target: HuyAI Singapore (bdeluacbzbdflxubhpha)
-- Rules: Non-destructive, 100% additive, Idempotent, RLS enabled, Server-Only.
-- ==============================================================================

-- 1. Infrastructure Compute Nodes Table
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

-- 2. Compute Node Heartbeats Table (Telemetry & Health Monitoring)
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

-- 3. Seed Initial Node Configuration (Dell Precision M4800)
-- Retains OFFLINE status until Dispatcher daemon actively reports heartbeat.
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

-- 4. ROW LEVEL SECURITY (RLS) POLICIES — SERVER-ONLY
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_heartbeats ENABLE ROW LEVEL SECURITY;

-- Clean state: Drop any client/authenticated policies per V1.2 Server-Only spec
DROP POLICY IF EXISTS "Authenticated can view compute nodes" ON public.nodes;
DROP POLICY IF EXISTS "Authenticated can view node heartbeats" ON public.node_heartbeats;

-- Service Role full access exclusively
DROP POLICY IF EXISTS "Service role full access on nodes" ON public.nodes;
CREATE POLICY "Service role full access on nodes"
    ON public.nodes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on node_heartbeats" ON public.node_heartbeats;
CREATE POLICY "Service role full access on node_heartbeats"
    ON public.node_heartbeats FOR ALL TO service_role USING (true) WITH CHECK (true);
