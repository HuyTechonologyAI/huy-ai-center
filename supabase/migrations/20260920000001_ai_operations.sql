-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20260920000001_ai_operations.sql
-- Architecture: V1.2 (HAIP/1.0 Multi-Agent Orchestration Platform)
-- Module: AI Operations (ai_tasks, ai_task_steps, ai_outputs)
-- Target: HuyAI Singapore (bdeluacbzbdflxubhpha)
-- Rules: Non-destructive, 100% additive, Idempotent, RLS enabled.
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. AI TASKS TABLE (Central HAIP Task & DAG State)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_tasks (
    -- Identity
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    conversation_id UUID NOT NULL,
    parent_task_id UUID REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    idempotency_key TEXT,

    -- HAIP Protocol Metadata
    haip_version TEXT NOT NULL DEFAULT '1.0',
    source_app TEXT NOT NULL DEFAULT 'control_center',
    intent TEXT NOT NULL,
    priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 5),
    assigned_capability TEXT,
    assigned_agent_id TEXT,

    -- Task Graph (DAG)
    depends_on UUID[] NOT NULL DEFAULT '{}',
    parallel_group TEXT,
    completion_condition JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Canonical State Machine
    status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN (
        'CREATED', 'PLANNING', 'QUEUED', 'CLAIMED', 'RUNNING',
        'REVIEWING', 'CORRECTING', 'FINALIZING', 'AWAITING_APPROVAL',
        'APPROVED', 'COMPLETED', 'RETRY_WAIT', 'BLOCKED', 'FAILED',
        'CANCELLED', 'EXPIRED'
    )),

    -- Risk Model & Human Approval
    risk_level INTEGER NOT NULL DEFAULT 0 CHECK (risk_level BETWEEN 0 AND 4),
    risk_context JSONB NOT NULL DEFAULT '{}'::jsonb,
    approval_required BOOLEAN NOT NULL DEFAULT false,
    approval_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED' CHECK (approval_status IN (
        'NOT_REQUIRED', 'PENDING', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED'
    )),
    approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    approval_note TEXT,
    CONSTRAINT chk_risk_approval CHECK (risk_level < 3 OR approval_required = true),

    -- Cost Guard & Observability (Zero Customer Billing)
    budget_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    estimated_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    actual_cost_usd NUMERIC(10, 4) NOT NULL DEFAULT 0.0000,
    token_usage JSONB NOT NULL DEFAULT '{"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}'::jsonb,
    runtime_ms INTEGER NOT NULL DEFAULT 0,

    -- Context & Payload References
    constraints JSONB NOT NULL DEFAULT '{}'::jsonb,
    input_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    input JSONB NOT NULL DEFAULT '{}'::jsonb,
    expected_outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
    output JSONB,

    -- Memory Scopes
    project_context_ref TEXT,
    task_memory_ref TEXT,

    -- Execution Control & Telemetry
    retry_count INTEGER NOT NULL DEFAULT 0,
    max_retries INTEGER NOT NULL DEFAULT 3,
    review_cycle INTEGER NOT NULL DEFAULT 0,
    state_version INTEGER NOT NULL DEFAULT 0,
    claimed_by_node_id TEXT,
    expires_at TIMESTAMPTZ,
    claimed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.ai_tasks IS 'Central autonomous task registry, DAG state, risk, budget, and approval management for HAIP/1.0';

-- Indexes for ai_tasks
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_tasks_idempotency_key 
    ON public.ai_tasks (idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_tasks_parent_task_id ON public.ai_tasks (parent_task_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_status ON public.ai_tasks (status);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_priority ON public.ai_tasks (priority ASC);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_owner_user_id ON public.ai_tasks (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_conversation_id ON public.ai_tasks (conversation_id);
CREATE INDEX IF NOT EXISTS idx_ai_tasks_depends_on ON public.ai_tasks USING gin (depends_on);

-- Optimized queue poll index for Dispatcher worker
CREATE INDEX IF NOT EXISTS idx_ai_tasks_queue_poll 
    ON public.ai_tasks (status, priority ASC, created_at ASC)
    WHERE status = 'QUEUED';

-- -----------------------------------------------------------------------------
-- 2. DETERMINISTIC STATE MACHINE VALIDATION TRIGGER
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_ai_task_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- No change in status: allow update (e.g. heartbeat, cost increment)
    IF OLD.status = NEW.status THEN
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    END IF;

    -- Strict terminal state lock: once terminal, no further transitions permitted
    IF OLD.status IN ('COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED') THEN
        RAISE EXCEPTION 'Illegal state transition: Task % is in terminal state % and cannot transition to %',
            OLD.id, OLD.status, NEW.status;
    END IF;

    -- Validate strictly against docs/HAIP_TASK_STATE_MACHINE.md
    IF (OLD.status = 'CREATED' AND NEW.status IN ('PLANNING', 'QUEUED', 'CANCELLED')) OR
       (OLD.status = 'PLANNING' AND NEW.status IN ('QUEUED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'QUEUED' AND NEW.status IN ('CLAIMED', 'CANCELLED', 'EXPIRED')) OR
       (OLD.status = 'CLAIMED' AND NEW.status IN ('RUNNING', 'RETRY_WAIT', 'CANCELLED', 'EXPIRED')) OR
       (OLD.status = 'RUNNING' AND NEW.status IN ('REVIEWING', 'RETRY_WAIT', 'BLOCKED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'REVIEWING' AND NEW.status IN ('CORRECTING', 'FINALIZING', 'AWAITING_APPROVAL', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'CORRECTING' AND NEW.status IN ('RUNNING', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'BLOCKED' AND NEW.status IN ('QUEUED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'RETRY_WAIT' AND NEW.status IN ('QUEUED', 'FAILED', 'CANCELLED')) OR
       (OLD.status = 'AWAITING_APPROVAL' AND NEW.status IN ('APPROVED', 'CORRECTING', 'CANCELLED', 'EXPIRED')) OR
       (OLD.status = 'APPROVED' AND NEW.status IN ('FINALIZING', 'CANCELLED')) OR
       (OLD.status = 'FINALIZING' AND NEW.status IN ('COMPLETED', 'FAILED', 'CANCELLED')) THEN
        
        -- Valid transition: increment optimistic concurrency version and timestamp
        NEW.state_version := OLD.state_version + 1;
        NEW.updated_at := timezone('utc'::text, now());
        RETURN NEW;
    ELSE
        RAISE EXCEPTION 'Illegal state transition: Cannot transition task % from % to %',
            OLD.id, OLD.status, NEW.status;
    END IF;
END;
$$;

COMMENT ON FUNCTION public.check_ai_task_status_transition() IS 'Database-level enforcement of canonical HAIP task state machine transitions';

DROP TRIGGER IF EXISTS trg_ai_tasks_status_transition ON public.ai_tasks;
CREATE TRIGGER trg_ai_tasks_status_transition
    BEFORE UPDATE OF status ON public.ai_tasks
    FOR EACH ROW
    EXECUTE FUNCTION public.check_ai_task_status_transition();

-- -----------------------------------------------------------------------------
-- 3. AI TASK STEPS TABLE (Durable HAIP Inter-Agent Execution & Message Trace)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_task_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    message_id UUID NOT NULL UNIQUE,
    haip_version TEXT NOT NULL DEFAULT '1.0',
    message_type TEXT NOT NULL CHECK (message_type IN (
        'TASK', 'PLAN', 'CLAIM', 'DELEGATE', 'TOOL_CALL', 'RESULT',
        'REVIEW', 'CORRECTION', 'STATE_UPDATE', 'ERROR',
        'FINAL_CANDIDATE', 'APPROVAL_REQUEST'
    )),
    intent TEXT NOT NULL,
    sender_type TEXT NOT NULL,
    sender_id TEXT NOT NULL,
    recipient_type TEXT NOT NULL,
    recipient_id TEXT NOT NULL,
    capability TEXT,
    envelope JSONB NOT NULL DEFAULT '{}'::jsonb,
    result_payload JSONB DEFAULT '{}'::jsonb,
    status TEXT NOT NULL DEFAULT 'CREATED',
    attempt INTEGER NOT NULL DEFAULT 1,
    idempotency_key TEXT,
    error_code TEXT,
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.ai_task_steps IS 'Durable HAIP inter-agent message logs, step traces, and review cycles. Strictly server-only.';

-- Indexes for ai_task_steps
CREATE INDEX IF NOT EXISTS idx_ai_task_steps_task_id ON public.ai_task_steps (task_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_task_steps_msg_type_status ON public.ai_task_steps (message_type, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ai_task_steps_idempotency_key 
    ON public.ai_task_steps (idempotency_key) 
    WHERE idempotency_key IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. AI OUTPUTS TABLE (Artifact References & Output Verification)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ai_outputs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.ai_tasks(id) ON DELETE CASCADE,
    artifact_ref TEXT NOT NULL,
    artifact_type TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    checksum_sha256 TEXT,
    mime_type TEXT,
    is_final BOOLEAN NOT NULL DEFAULT false,
    confidence NUMERIC(4, 3),
    qa_status TEXT NOT NULL DEFAULT 'pending' CHECK (qa_status IN ('pending', 'passed', 'failed', 'waived')),
    created_by_agent_id TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_ai_outputs_task_artifact UNIQUE (task_id, artifact_ref, version)
);

COMMENT ON TABLE public.ai_outputs IS 'Verified final and intermediate artifact references. No raw binary files.';

CREATE INDEX IF NOT EXISTS idx_ai_outputs_task ON public.ai_outputs (task_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_artifact_ref ON public.ai_outputs (artifact_ref);

-- -----------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------
ALTER TABLE public.ai_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_outputs ENABLE ROW LEVEL SECURITY;

-- 5.1 ai_tasks: OWNER-READ
DROP POLICY IF EXISTS "Users can view own tasks" ON public.ai_tasks;
CREATE POLICY "Users can view own tasks"
    ON public.ai_tasks FOR SELECT TO authenticated
    USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own tasks" ON public.ai_tasks;
CREATE POLICY "Users can insert own tasks"
    ON public.ai_tasks FOR INSERT TO authenticated
    WITH CHECK (owner_user_id = auth.uid() OR owner_user_id IS NULL);

DROP POLICY IF EXISTS "Service role full access on ai_tasks" ON public.ai_tasks;
CREATE POLICY "Service role full access on ai_tasks"
    ON public.ai_tasks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5.2 ai_task_steps: SERVER-ONLY (Internal agent chatter strictly hidden from clients)
DROP POLICY IF EXISTS "Users can view steps of own tasks" ON public.ai_task_steps;
DROP POLICY IF EXISTS "Service role full access on ai_task_steps" ON public.ai_task_steps;
CREATE POLICY "Service role full access on ai_task_steps"
    ON public.ai_task_steps FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5.3 ai_outputs: OWNER-READ (Clients can only view outputs belonging to own tasks)
DROP POLICY IF EXISTS "Users can view outputs of own tasks" ON public.ai_outputs;
CREATE POLICY "Users can view outputs of own tasks"
    ON public.ai_outputs FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ai_tasks t
        WHERE t.id = ai_outputs.task_id
          AND t.owner_user_id = auth.uid()
    ));

DROP POLICY IF EXISTS "Service role full access on ai_outputs" ON public.ai_outputs;
CREATE POLICY "Service role full access on ai_outputs"
    ON public.ai_outputs FOR ALL TO service_role USING (true) WITH CHECK (true);
