-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20260920000005_queue_and_governance.sql
-- Architecture: V1.2 (HAIP/1.0 Multi-Agent Orchestration Platform)
-- Module: Queue Gateway & Governance (PGMQ, Secure RPCs, Zero-Touch Audit)
-- Target: HuyAI Singapore (bdeluacbzbdflxubhpha)
-- Rules: Non-destructive, 100% additive, Idempotent, RLS enabled, Server-Only.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. QUEUE MODULE: SUPABASE QUEUES (PGMQ)
-- -----------------------------------------------------------------------------

-- 1.1 Enable pgmq extension if not installed (Postgres available version: 1.5.1)
CREATE EXTENSION IF NOT EXISTS pgmq;

-- 1.2 Create primary queue: ai-jobs as a Durable Basic Queue (logged heap table)
DO $$
BEGIN
    PERFORM pgmq.create('ai-jobs');
    RAISE NOTICE 'PGMQ durable basic queue ai-jobs verified/created successfully.';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Notice on pgmq.create(ai-jobs): %', SQLERRM;
END $$;

-- -----------------------------------------------------------------------------
-- 2. SECURE SERVER-SIDE PGMQ RPC GATEWAY FUNCTIONS (SERVICE-ROLE ONLY)
-- -----------------------------------------------------------------------------

-- 2.1 Enqueue Job RPC
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
    -- Validate envelope task_id match
    IF (p_envelope ->> 'task_id')::UUID IS DISTINCT FROM p_task_id THEN
        RAISE EXCEPTION 'Mismatched task_id between parameter and HAIP envelope';
    END IF;

    -- Send to durable basic queue ai-jobs
    v_msg_id := pgmq.send('ai-jobs', p_envelope);
    RETURN v_msg_id;
END;
$$;

COMMENT ON FUNCTION public.haip_enqueue_job(UUID, TEXT, JSONB) IS 'Secure server-side enqueue RPC for HAIP envelopes';

REVOKE ALL ON FUNCTION public.haip_enqueue_job(UUID, TEXT, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.haip_enqueue_job(UUID, TEXT, JSONB) TO service_role;

-- 2.2 Read Jobs Batch RPC
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

-- 2.3 Archive Completed Job RPC
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

-- 2.4 Atomic AI Tasks Claim Procedure (Direct ai_tasks Queue Polling Fallback)
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
    WHERE status = 'QUEUED'
    ORDER BY priority ASC, created_at ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    IF v_task_id IS NOT NULL THEN
        RETURN QUERY
        UPDATE public.ai_tasks
        SET 
            status = 'CLAIMED',
            claimed_by_node_id = p_worker_id,
            claimed_at = timezone('utc'::text, now()),
            updated_at = timezone('utc'::text, now())
        WHERE id = v_task_id
        RETURNING *;
    END IF;
    RETURN;
END;
$$;

COMMENT ON FUNCTION public.claim_ai_task(TEXT) IS 'Atomic direct claim function for Dell Precision M4800 worker node';

REVOKE ALL ON FUNCTION public.claim_ai_task(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_ai_task(TEXT) TO service_role;

-- -----------------------------------------------------------------------------
-- 3. GOVERNANCE & AUDIT LOGS MODULE (ZERO-TOUCH ON EXISTING PRODUCTION TABLES)
-- -----------------------------------------------------------------------------
-- ZERO DDL is applied to public.audit_logs. Existing schema (id, user_id, user_email,
-- user_name, action_type, target_resource, details JSONB, created_at) is 100% preserved.
-- All HAIP audit context and human approvals are stored in details JSONB.
-- Telemetry is tracked in nodes/node_heartbeats, and step traces in ai_task_steps.
