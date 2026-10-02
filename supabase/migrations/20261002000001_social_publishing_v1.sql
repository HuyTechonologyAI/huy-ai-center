-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20261002000001_social_publishing_v1.sql
-- Architecture: 5-Plane Social Publishing Engine (Control, Orchestration, Media, Credential, Provider)
-- Compliance: Luật An ninh mạng 2018, Luật BV Dữ liệu cá nhân 91/2025/QH15,
--             Nghị định 356/2025/NĐ-CP, Nghị định 330/2026/NĐ-CP, CV 5512/BGDĐT, TT 22/2021/TT-BGDĐT
-- Idempotency: Unique constraint {content_id}:{revision}:{platform}:{account_ref}
-- Security: Zero plaintext secrets, Token Broker references only (vault://...)
-- Target: HuyAI Supabase (bdeluacbzbdflxubhpha)
-- ==============================================================================

-- 1. SOCIAL CONNECTIONS TABLE (Credential plane references)
CREATE TABLE IF NOT EXISTS public.social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    platform TEXT NOT NULL CHECK (platform IN ('facebook', 'instagram', 'threads', 'linkedin', 'x', 'tiktok', 'youtube')),
    account_ref TEXT NOT NULL,
    display_name TEXT NOT NULL,
    credential_ref TEXT NOT NULL, -- Opaque URI: vault://social/{platform}/{account_ref}
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'PAUSED')),
    capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,
    rate_limit_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_social_connections_platform_account UNIQUE (platform, account_ref)
);

-- 2. SOCIAL PUBLISH INTENTS TABLE (Control plane batch/intent declaration)
CREATE TABLE IF NOT EXISTS public.social_publish_intents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id TEXT NOT NULL DEFAULT 'FIRST-REVENUE-V3',
    target_platforms JSONB NOT NULL, -- e.g. ["facebook", "instagram", "threads", "tiktok", "youtube"]
    schedule_type TEXT NOT NULL DEFAULT 'IMMEDIATE' CHECK (schedule_type IN ('IMMEDIATE', 'SCHEDULED')),
    scheduled_for TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN (
        'QUEUED', 'PROCESSING', 'PUBLISHED', 'PARTIAL_SUCCESS', 'FAILED', 'CANCELLED', 'ROLLED_BACK'
    )),
    total_jobs INT NOT NULL DEFAULT 0,
    successful_jobs INT NOT NULL DEFAULT 0,
    failed_jobs INT NOT NULL DEFAULT 0,
    created_by TEXT NOT NULL DEFAULT 'ANTIGRAVITY_SUPERVISOR',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. SOCIAL CONTENT ITEMS TABLE (Platform-specific transformed content)
CREATE TABLE IF NOT EXISTS public.social_content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id UUID REFERENCES public.social_publish_intents(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    revision INT NOT NULL DEFAULT 1,
    title TEXT,
    body TEXT NOT NULL,
    tags JSONB NOT NULL DEFAULT '[]'::jsonb,
    ai_label_applied BOOLEAN NOT NULL DEFAULT true,
    vietnamese_legal_compliance JSONB NOT NULL DEFAULT '{
        "cybersecurity_law_2018": true,
        "pdp_law_91_2025": true,
        "nd_356_2025": true,
        "nd_330_2026": true,
        "edu_cv_5512": true,
        "edu_tt_22": true
    }'::jsonb,
    media_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. SOCIAL MEDIA ASSETS TABLE (Media plane processed artifacts)
CREATE TABLE IF NOT EXISTS public.social_media_assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID REFERENCES public.social_content_items(id) ON DELETE CASCADE,
    media_type TEXT NOT NULL CHECK (media_type IN ('IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT')),
    original_url TEXT NOT NULL,
    processed_url TEXT,
    aspect_ratio TEXT CHECK (aspect_ratio IN ('1:1', '4:5', '16:9', '9:16')),
    mime_type TEXT NOT NULL,
    file_size_bytes BIGINT,
    checksum_sha256 TEXT,
    processing_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'READY', 'FAILED')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. SOCIAL JOBS TABLE (Orchestration plane discrete task units)
CREATE TABLE IF NOT EXISTS public.social_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intent_id UUID REFERENCES public.social_publish_intents(id) ON DELETE CASCADE,
    content_id UUID REFERENCES public.social_content_items(id) ON DELETE CASCADE,
    platform TEXT NOT NULL,
    account_ref TEXT NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL, -- {content_id}:{revision}:{platform}:{account_ref}
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN (
        'PENDING', 'VALIDATING', 'MEDIA_PREPARING', 'POSTING', 'RECONCILING', 'PUBLISHED', 'FAILED', 'CANCELLED', 'ROLLED_BACK'
    )),
    post_mode TEXT NOT NULL DEFAULT 'DEFAULT' CHECK (post_mode IN ('DEFAULT', 'UPLOAD_DRAFT', 'DIRECT_POST')),
    provider_post_id TEXT,
    provider_url TEXT,
    error_code TEXT,
    error_message TEXT,
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    next_retry_at TIMESTAMPTZ,
    response_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. SOCIAL JOB RECONCILIATIONS TABLE (Anti-duplicate & ambiguous timeout resolution)
CREATE TABLE IF NOT EXISTS public.social_job_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID REFERENCES public.social_jobs(id) ON DELETE CASCADE,
    reason TEXT NOT NULL, -- 'HTTP_TIMEOUT', 'GATEWAY_504', 'AMBIGUOUS_PROVIDER_STATE'
    reconcile_status TEXT NOT NULL CHECK (reconcile_status IN ('CHECKING', 'FOUND_PUBLISHED', 'NOT_FOUND_RETRYABLE', 'PERMANENT_ERROR')),
    reconcile_evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
    reconciled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. SOCIAL AUDIT LOGS TABLE (Zero-trust audit & cryptographic provenance)
CREATE TABLE IF NOT EXISTS public.social_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    signature_verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. INDEXES FOR HIGH-THROUGHPUT QUEUEING & RECONCILIATION
CREATE INDEX IF NOT EXISTS idx_social_jobs_status_next_retry ON public.social_jobs(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_social_jobs_intent_id ON public.social_jobs(intent_id);
CREATE INDEX IF NOT EXISTS idx_social_content_items_intent_id ON public.social_content_items(intent_id);
CREATE INDEX IF NOT EXISTS idx_social_media_assets_content_id ON public.social_media_assets(content_id);
CREATE INDEX IF NOT EXISTS idx_social_audit_logs_target ON public.social_audit_logs(target_type, target_id);

-- 9. SEED INITIAL OFFICIAL SOCIAL CONNECTIONS
INSERT INTO public.social_connections (platform, account_ref, display_name, credential_ref, status, capabilities)
VALUES
    ('facebook', 'fb_page_smartteacher_vn', 'Smart Teacher Schedule — Trợ Lý Sư Phạm AI', 'vault://social/meta/fb_page_smartteacher_vn', 'ACTIVE', '["POST_FEED", "IMAGE_POST", "CAROUSEL", "VIDEO_REELS"]'::jsonb),
    ('instagram', 'ig_smartteacher_ai_vn', 'Smart Teacher AI Vietnam', 'vault://social/meta/ig_smartteacher_ai_vn', 'ACTIVE', '["IMAGE_FEED", "CAROUSEL", "REELS"]'::jsonb),
    ('threads', 'th_smartteacher_ai_vn', 'Smart Teacher AI Threads', 'vault://social/meta/th_smartteacher_ai_vn', 'ACTIVE', '["TEXT_POST", "IMAGE_POST", "THREAD_SERIES"]'::jsonb),
    ('tiktok', 'tt_smartteacher_ai', 'Thầy Huy AI & Trợ Lý Giáo Viên', 'vault://social/tiktok/tt_smartteacher_ai', 'ACTIVE', '["UPLOAD_DRAFT", "DIRECT_POST_GATED"]'::jsonb),
    ('youtube', 'yt_smartteacher_official', 'Smart Teacher Schedule Official', 'vault://social/google/yt_smartteacher_official', 'ACTIVE', '["COMMUNITY_POST", "SHORTS_UPLOAD", "VIDEO_UPLOAD"]'::jsonb)
ON CONFLICT (platform, account_ref) DO UPDATE
SET display_name = EXCLUDED.display_name,
    credential_ref = EXCLUDED.credential_ref,
    status = EXCLUDED.status,
    capabilities = EXCLUDED.capabilities,
    updated_at = timezone('utc'::text, now());
