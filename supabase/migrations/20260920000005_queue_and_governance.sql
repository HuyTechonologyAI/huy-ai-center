-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20260920000005_queue_and_governance.sql
-- Module: Queue & Governance (pgmq/Native Queue, Audit Logs extension)
-- Target: HuyAI Singapore (bdeluacbzbdflxubhpha)
-- Rules: Non-destructive, 100% additive, Idempotent, RLS enabled.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. QUEUE MODULE: PGMQ EXTENSION & NATIVE QUEUE FALLBACK
-- -----------------------------------------------------------------------------

-- 1.1 Enable pgmq extension if supported by the Supabase Cloud tier
DO $$
BEGIN
    CREATE EXTENSION IF NOT EXISTS pgmq;
    PERFORM pgmq.create('ai-jobs');
    RAISE NOTICE 'pgmq extension and ai-jobs queue successfully initialized.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pgmq extension is not enabled on this environment; falling back to PostgreSQL native queue.';
END $$;

-- 1.2 Resilient Native PostgreSQL Queue (Zero-Redis Architecture)
CREATE TABLE IF NOT EXISTS public.queue_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    queue_name TEXT NOT NULL CHECK (queue_name IN ('ai-jobs', 'github-scan', 'notifications', 'maintenance')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'running', 'completed', 'failed', 'cancelled')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    result JSONB,
    claimed_by TEXT,
    claimed_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.queue_messages IS 'Native PostgreSQL queue handling ai-jobs and async operations without Redis';

CREATE INDEX IF NOT EXISTS idx_queue_messages_poll 
    ON public.queue_messages (queue_name, status, scheduled_for, priority DESC, created_at ASC)
    WHERE status = 'queued';

-- 1.3 Atomic Generic Queue Claim Procedure (Concurrency & Deadlock Safe)
CREATE OR REPLACE FUNCTION public.claim_queue_message(
    p_queue_name TEXT,
    p_worker_id TEXT,
    p_batch_size INTEGER DEFAULT 1
)
RETURNS SETOF public.queue_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_ids UUID[];
BEGIN
    SELECT array_agg(id) INTO v_ids
    FROM (
        SELECT id
        FROM public.queue_messages
        WHERE queue_name = p_queue_name
          AND status = 'queued'
          AND scheduled_for <= timezone('utc'::text, now())
        ORDER BY 
            CASE priority 
                WHEN 'urgent' THEN 1
                WHEN 'high' THEN 2
                WHEN 'normal' THEN 3
                WHEN 'low' THEN 4
                ELSE 5 
            END ASC,
            created_at ASC
        LIMIT p_batch_size
        FOR UPDATE SKIP LOCKED
    ) q;

    IF v_ids IS NOT NULL AND array_length(v_ids, 1) > 0 THEN
        RETURN QUERY
        UPDATE public.queue_messages
        SET 
            status = 'claimed',
            claimed_by = p_worker_id,
            claimed_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = ANY(v_ids)
        RETURNING *;
    END IF;
    RETURN;
END;
$$;

-- 1.4 Atomic AI Tasks Claim Procedure (Direct ai_tasks Queue Polling)
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

-- -----------------------------------------------------------------------------
-- 2. GOVERNANCE & AUDIT LOGS MODULE (REUSE & EXTEND EXISTING)
-- -----------------------------------------------------------------------------

-- Non-destructive additive extension to existing HuyAI audit_logs table
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_profile_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS organization_id UUID;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS entity_id TEXT;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action, created_at DESC);

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.queue_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Queue messages: Service Role exclusive
DROP POLICY IF EXISTS "Service role full on queue_messages" ON public.queue_messages;
CREATE POLICY "Service role full on queue_messages"
    ON public.queue_messages FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Audit logs: Authenticated can view own logs, Service role has full access
DROP POLICY IF EXISTS "Users can view own audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own audit logs"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (
        user_id = (auth.uid())::text OR
        user_email = (auth.jwt() ->> 'email') OR
        actor_profile_id = auth.uid()
    );

DROP POLICY IF EXISTS "Service role full on audit_logs" ON public.audit_logs;
CREATE POLICY "Service role full on audit_logs"
    ON public.audit_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
