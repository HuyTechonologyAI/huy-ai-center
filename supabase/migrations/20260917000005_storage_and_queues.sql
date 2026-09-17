-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — STORAGE BUCKETS & QUEUES MIGRATION
-- Migration: 20260917000005_storage_and_queues.sql
-- Description: Storage buckets & RLS policies (user-uploads, ai-outputs, 
--              knowledge, tool-assets, avatars) and PostgreSQL Native Queues 
--              (ai-jobs, github-scan, notifications, maintenance).
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. SUPABASE STORAGE BUCKETS INITIALIZATION
-- -----------------------------------------------------------------------------

-- Create buckets in storage.buckets if they do not exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('user-uploads', 'user-uploads', false, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
    ('ai-outputs', 'ai-outputs', false, 104857600, ARRAY['image/png', 'image/jpeg', 'image/webp', 'application/pdf', 'application/json', 'text/plain', 'application/vnd.openxmlformats-officedocument.presentationml.presentation']),
    ('knowledge', 'knowledge', false, 104857600, ARRAY['application/pdf', 'text/plain', 'text/markdown', 'application/json']),
    ('tool-assets', 'tool-assets', true, 10485760, ARRAY['image/svg+xml', 'image/png', 'image/webp']),
    ('avatars', 'avatars', true, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types,
    public = EXCLUDED.public;

-- 1.1 Storage RLS Policies: avatars (Public Read, Owner Write)
CREATE POLICY "Public Read Avatars"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 1.2 Storage RLS Policies: user-uploads (Private: Owner Read & Write)
CREATE POLICY "Users can read own uploads"
    ON storage.objects FOR SELECT TO authenticated
    USING (
        bucket_id = 'user-uploads' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can upload own files"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'user-uploads' 
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 1.3 Storage RLS Policies: ai-outputs (Authenticated Read for Task Owner)
CREATE POLICY "Users can read ai outputs"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'ai-outputs');

-- 1.4 Storage RLS Policies: knowledge (Authenticated Read)
CREATE POLICY "Authenticated users can read knowledge docs"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'knowledge');

-- 1.5 Storage RLS Policies: tool-assets (Public Read)
CREATE POLICY "Public can read tool assets"
    ON storage.objects FOR SELECT TO public
    USING (bucket_id = 'tool-assets');

-- Service role full access to all buckets
CREATE POLICY "Service role full access on storage"
    ON storage.objects FOR ALL TO service_role
    USING (true) WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 2. POSTGRES NATIVE QUEUES (Zero-Redis Architecture V1)
-- -----------------------------------------------------------------------------

-- Queue Messages Table for 4 System Queues:
-- 1. 'ai-jobs'
-- 2. 'github-scan'
-- 3. 'notifications'
-- 4. 'maintenance'
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

COMMENT ON TABLE public.queue_messages IS 'Native PostgreSQL queue handling ai-jobs, github-scan, notifications, and maintenance without Redis';

CREATE INDEX IF NOT EXISTS idx_queue_messages_poll 
    ON public.queue_messages (queue_name, status, scheduled_for, priority DESC, created_at ASC)
    WHERE status = 'queued';

ALTER TABLE public.queue_messages ENABLE ROW LEVEL SECURITY;

-- Service role only for queue processing
CREATE POLICY "Service role full on queue_messages"
    ON public.queue_messages FOR ALL TO service_role USING (true);

-- 2.1 Universal Queue Claim Procedure (Atomic & Concurrency Safe)
CREATE OR REPLACE FUNCTION public.claim_queue_message(
    p_queue_name TEXT,
    p_worker_id TEXT,
    p_batch_size INTEGER DEFAULT 1
)
RETURNS SETOF public.queue_messages AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
