-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20260920000005_queue_and_governance.sql
-- Module: Queue & Governance (Supabase Queues / PGMQ, Audit Logs extension)
-- Target: HuyAI Singapore (bdeluacbzbdflxubhpha)
-- Rules: Non-destructive, 100% additive, Idempotent, RLS enabled.
-- Architecture: PGMQ Only (Zero-Redis, No custom queue_messages fallback table).
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. QUEUE MODULE: SUPABASE QUEUES (PGMQ)
-- -----------------------------------------------------------------------------

-- 1.1 Enable pgmq extension if not installed (Postgres available version: 1.5.1)
CREATE EXTENSION IF NOT EXISTS pgmq;

-- 1.2 Create primary queue: ai-jobs idempotently
DO $$
BEGIN
    PERFORM pgmq.create('ai-jobs');
    RAISE NOTICE 'PGMQ queue ai-jobs verified/created successfully.';
EXCEPTION WHEN OTHERS THEN
    -- Queue already exists or notice
    RAISE NOTICE 'Notice on pgmq.create(ai-jobs): %', SQLERRM;
END $$;

-- 1.3 Atomic AI Tasks Claim Procedure (Direct ai_tasks Queue Polling with FOR UPDATE SKIP LOCKED)
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
-- 3. ROW LEVEL SECURITY (RLS) POLICIES ON EXTENDED AUDIT LOGS
-- -----------------------------------------------------------------------------

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

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
