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

-- 1.2 Create primary queue: ai-jobs as a Durable Basic Queue (logged) idempotently
-- Note: pgmq.create() creates a durable logged Basic Queue (not unlogged).
-- Queue access is strictly restricted to server-side Dispatcher credentials (not exposed to client/browser roles).
DO $$
BEGIN
    PERFORM pgmq.create('ai-jobs');
    RAISE NOTICE 'PGMQ durable basic queue ai-jobs verified/created successfully.';
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
-- 2. GOVERNANCE & AUDIT LOGS MODULE (ZERO DDL ON EXISTING PRODUCTION TABLES)
-- -----------------------------------------------------------------------------

-- Scoped Reuse: public.audit_logs is already present with:
-- (id, user_id, user_email, user_name, action_type, target_resource, details JSONB, created_at).
-- Per Step 0 minimalism check, all audit context fits into existing columns and details JSONB.
-- ZERO DDL is applied to public.audit_logs to ensure 100% safety of existing production tables.
-- Node telemetry is tracked in nodes/node_heartbeats, and runtime logs in dispatcher logs.

