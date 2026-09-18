-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — CORE SCHEMA MIGRATION
-- Migration: 20260917000001_create_ai_task_queue.sql
-- Description: Isolated tables for AI Task Queue, Worker Nodes, and Logs.
-- NOTE: 100% NON-DESTRUCTIVE to existing ecosystem tables.
-- ==============================================================================

-- 1. AI Worker Nodes Table
CREATE TABLE IF NOT EXISTS public.ai_worker_nodes (
    node_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    hostname TEXT,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'draining', 'error')),
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    max_concurrency INTEGER NOT NULL DEFAULT 2,
    current_load INTEGER NOT NULL DEFAULT 0,
    system_specs JSONB DEFAULT '{}'::jsonb,
    last_heartbeat_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. AI Tasks Table (Task Queue)
CREATE TABLE IF NOT EXISTS public.ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_app TEXT NOT NULL CHECK (source_app IN ('huycncdsai', 'gvcncdsai', 'smarttax_ai', 'control_center', 'external_api')),
    task_type TEXT NOT NULL CHECK (task_type IN ('llm_inference', 'rag_query', 'workflow_automation', 'model_training')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'running', 'completed', 'failed', 'timeout')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    claimed_by_worker_id TEXT REFERENCES public.ai_worker_nodes(node_id) ON DELETE SET NULL,
    claimed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Optimized indexes for Queue Polling
CREATE INDEX IF NOT EXISTS idx_ai_tasks_queue_poll 
    ON public.ai_tasks (status, priority DESC, created_at ASC)
    WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_ai_tasks_source_app ON public.ai_tasks (source_app, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_claimed_worker ON public.ai_tasks (claimed_by_worker_id, status);

-- 3. AI Task Logs Table
CREATE TABLE IF NOT EXISTS public.ai_task_logs (
    id BIGSERIAL PRIMARY KEY,
    task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    worker_id TEXT,
    event_type TEXT NOT NULL,
    message TEXT NOT NULL,
    meta JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_ai_task_logs_task_id ON public.ai_task_logs (task_id, created_at ASC);

-- 4. Atomic Task Claim Procedure (Race condition safe)
CREATE OR REPLACE FUNCTION public.claim_ai_task(p_worker_id TEXT)
RETURNS SETOF public.ai_tasks 
SET search_path = public, pg_temp
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
            claimed_by_worker_id = p_worker_id,
            claimed_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_task_id
        RETURNING *;
    END IF;
    RETURN;
END;
$$;

-- 5. Row-Level Security (RLS) Enablement
ALTER TABLE public.ai_worker_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_logs ENABLE ROW LEVEL SECURITY;

-- Service role has full access
DROP POLICY IF EXISTS "Service role full access on ai_worker_nodes" ON public.ai_worker_nodes;
CREATE POLICY "Service role full access on ai_worker_nodes"
    ON public.ai_worker_nodes FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on ai_tasks" ON public.ai_tasks;
CREATE POLICY "Service role full access on ai_tasks"
    ON public.ai_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on ai_task_logs" ON public.ai_task_logs;
CREATE POLICY "Service role full access on ai_task_logs"
    ON public.ai_task_logs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Public read access to worker node statuses (safe metadata only)
DROP POLICY IF EXISTS "Public read worker nodes" ON public.ai_worker_nodes;
CREATE POLICY "Public read worker nodes"
    ON public.ai_worker_nodes FOR SELECT TO anon USING (true);
