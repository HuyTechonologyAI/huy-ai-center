-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20260921010006_ai_center_security_hardening.sql
-- Architecture: V1.2 (HAIP/1.0 Multi-Agent Orchestration Platform)
-- Phase: 06I — Post-Migration Security Hardening & Performance Optimization
-- Target: HuyAI Singapore (bdeluacbzbdflxubhpha)
-- Rules: Non-destructive, 100% additive, Idempotent, Strict Principle of Least Privilege
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. FIX TRIGGER FUNCTION RPC EXPOSURE
-- -----------------------------------------------------------------------------
-- The trigger function check_ai_task_status_transition is intended solely for
-- internal database trigger execution on public.ai_tasks. Revoke execute rights
-- from PUBLIC, anon, and authenticated so it is never exposed as a PostgREST RPC.
REVOKE ALL ON FUNCTION public.check_ai_task_status_transition() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.check_ai_task_status_transition() IS 
    'Database-level enforcement of canonical HAIP task state machine transitions (Internal Trigger Only - No Public RPC)';

-- -----------------------------------------------------------------------------
-- 2. REMOVE CLIENT DIRECT INSERT POLICY ON public.ai_tasks
-- -----------------------------------------------------------------------------
-- Under HAIP Architecture V1.2, all task creation is strictly orchestrated
-- server-side (via Next.js API route / service_role). Authenticated client users
-- may only READ their own task summaries, and cannot directly insert tasks.
DROP POLICY IF EXISTS "Users can insert own tasks" ON public.ai_tasks;

-- -----------------------------------------------------------------------------
-- 3. OPTIMIZE OWNER-READ RLS POLICIES WITH InitPlan CACHING
-- -----------------------------------------------------------------------------
-- Wrap auth.uid() in (SELECT auth.uid()) to enable Postgres InitPlan caching
-- across result sets rather than per-row re-evaluation.

-- 3.1 ai_tasks owner read
DROP POLICY IF EXISTS "Users can view own tasks" ON public.ai_tasks;
CREATE POLICY "Users can view own tasks" ON public.ai_tasks
    FOR SELECT
    TO authenticated
    USING (owner_user_id = (SELECT auth.uid()));

-- 3.2 ai_outputs owner read
DROP POLICY IF EXISTS "Users can view outputs of own tasks" ON public.ai_outputs;
CREATE POLICY "Users can view outputs of own tasks" ON public.ai_outputs
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.ai_tasks t
            WHERE t.id = ai_outputs.task_id
              AND t.owner_user_id = (SELECT auth.uid())
        )
    );

-- -----------------------------------------------------------------------------
-- 4. ADD MISSING APPROVAL FOREIGN KEY INDEX
-- -----------------------------------------------------------------------------
-- Add covering index for foreign key ai_tasks_approved_by_fkey to optimize
-- joins and approval lookup queries.
CREATE INDEX IF NOT EXISTS idx_ai_tasks_approved_by 
    ON public.ai_tasks (approved_by);

-- -----------------------------------------------------------------------------
