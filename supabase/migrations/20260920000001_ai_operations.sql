-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20260920000001_ai_operations.sql
-- Module: AI Operations (ai_tasks, ai_task_steps, ai_outputs)
-- Target: HuyAI Singapore (bdeluacbzbdflxubhpha)
-- Rules: Non-destructive, 100% additive, Idempotent, RLS enabled.
-- ==============================================================================

-- 1. AI Tasks Table (Central AI Job Pipeline)
CREATE TABLE IF NOT EXISTS public.ai_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_app TEXT NOT NULL CHECK (source_app IN ('education', 'tax', 'control_center', 'external_api', 'huycncdsai', 'gvcncdsai', 'smarttax_ai')),
    task_type TEXT NOT NULL CHECK (task_type IN ('lesson_plan', 'presentation_slides', 'quiz_generator', 'tax_report', 'rag_query', 'custom_workflow', 'llm_inference', 'workflow_automation', 'model_training')),
    priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'claimed', 'running', 'completed', 'failed', 'cancelled', 'timeout')),
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    input JSONB DEFAULT '{}'::jsonb,
    result JSONB,
    output JSONB,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    organization_id UUID,
    claimed_by_node_id TEXT,
    claimed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    timeout_seconds INTEGER NOT NULL DEFAULT 300,
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    error TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.ai_tasks IS 'Central decoupled asynchronous AI execution jobs across all ecosystem apps';

-- Optimized queue polling index (FOR UPDATE SKIP LOCKED)
CREATE INDEX IF NOT EXISTS idx_ai_tasks_queue_poll 
    ON public.ai_tasks (status, priority DESC, created_at ASC)
    WHERE status = 'queued';

CREATE INDEX IF NOT EXISTS idx_ai_tasks_user_id ON public.ai_tasks (user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_user_email ON public.ai_tasks (user_email);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_source_app ON public.ai_tasks (source_app, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_claimed_node ON public.ai_tasks (claimed_by_node_id, status);

-- 2. AI Task Steps Table (Granular Execution Pipeline)
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_task_step UNIQUE (task_id, step_number)
);

COMMENT ON TABLE public.ai_task_steps IS 'Individual pipeline steps for complex agent and multi-turn workflows';

CREATE INDEX IF NOT EXISTS idx_ai_task_steps_task ON public.ai_task_steps (task_id, step_number ASC);

-- 3. AI Outputs Table (Structured Results & Token Telemetry)
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

COMMENT ON TABLE public.ai_outputs IS 'Structured output payload, token consumption metrics, and latency logs';

CREATE INDEX IF NOT EXISTS idx_ai_outputs_task ON public.ai_outputs (task_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outputs ENABLE ROW LEVEL SECURITY;

-- AI Tasks: Users can read and insert their own tasks
DROP POLICY IF EXISTS "Users can view own tasks" ON public.ai_tasks;
CREATE POLICY "Users can view own tasks"
    ON public.ai_tasks FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR user_email = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.ai_tasks;
CREATE POLICY "Users can insert own tasks"
    ON public.ai_tasks FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Steps & Outputs: Inherited read access from parent task
DROP POLICY IF EXISTS "Users can view steps of own tasks" ON public.ai_task_steps;
CREATE POLICY "Users can view steps of own tasks"
    ON public.ai_task_steps FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ai_tasks t
        WHERE t.id = ai_task_steps.task_id
          AND (t.user_id = auth.uid() OR t.user_email = (auth.jwt() ->> 'email'))
    ));

DROP POLICY IF EXISTS "Users can view outputs of own tasks" ON public.ai_outputs;
CREATE POLICY "Users can view outputs of own tasks"
    ON public.ai_outputs FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ai_tasks t
        WHERE t.id = ai_outputs.task_id
          AND (t.user_id = auth.uid() OR t.user_email = (auth.jwt() ->> 'email'))
    ));

-- Service Role full access (Backend routes & On-prem Dell Worker)
DROP POLICY IF EXISTS "Service role full access on ai_tasks" ON public.ai_tasks;
CREATE POLICY "Service role full access on ai_tasks"
    ON public.ai_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on ai_task_steps" ON public.ai_task_steps;
CREATE POLICY "Service role full access on ai_task_steps"
    ON public.ai_task_steps FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access on ai_outputs" ON public.ai_outputs;
CREATE POLICY "Service role full access on ai_outputs"
    ON public.ai_outputs FOR ALL TO service_role USING (true) WITH CHECK (true);
