-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20260920000004_github_radar.sql
-- Module: GitHub Radar (projects, reviews, releases)
-- Target: HuyAI Singapore (bdeluacbzbdflxubhpha)
-- Rules: Non-destructive, 100% additive, Idempotent, RLS enabled.
-- ==============================================================================

-- 1. GitHub Monitored Projects Table
CREATE TABLE IF NOT EXISTS public.github_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_owner TEXT NOT NULL,
    repo_name TEXT NOT NULL,
    full_name TEXT NOT NULL UNIQUE,
    url TEXT NOT NULL,
    stars INTEGER DEFAULT 0,
    forks INTEGER DEFAULT 0,
    license TEXT,
    category TEXT NOT NULL CHECK (category IN ('llm_framework', 'rag', 'agent', 'multimodal', 'workflow', 'evaluation')),
    is_monitored BOOLEAN NOT NULL DEFAULT true,
    last_scanned_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.github_projects IS 'Monitored open-source AI repositories scanned for updates and security';

CREATE INDEX IF NOT EXISTS idx_github_projects_category ON public.github_projects (category);
CREATE INDEX IF NOT EXISTS idx_github_projects_monitored ON public.github_projects (is_monitored);

-- 2. GitHub Project Reviews Table (Architecture & Security Analysis)
CREATE TABLE IF NOT EXISTS public.github_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.github_projects(id) ON DELETE CASCADE,
    review_score NUMERIC(3, 1),
    security_grade TEXT CHECK (security_grade IN ('A', 'B', 'C', 'D', 'F')),
    architecture_notes TEXT,
    license_risk TEXT CHECK (license_risk IN ('low', 'medium', 'high', 'incompatible')),
    raw_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
    reviewed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.github_reviews IS 'Automated code reviews and architectural assessments of monitored projects';

CREATE INDEX IF NOT EXISTS idx_github_reviews_project ON public.github_reviews (project_id);

-- 3. GitHub Project Versions Table (Releases Tracking)
CREATE TABLE IF NOT EXISTS public.github_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.github_projects(id) ON DELETE CASCADE,
    release_tag TEXT NOT NULL,
    release_title TEXT,
    published_at TIMESTAMPTZ,
    changelog_summary TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_github_project_release UNIQUE (project_id, release_tag)
);

COMMENT ON TABLE public.github_versions IS 'Release tags, changelogs, and version history of monitored repositories';

CREATE INDEX IF NOT EXISTS idx_github_versions_project ON public.github_versions (project_id);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.github_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_versions ENABLE ROW LEVEL SECURITY;

-- Authenticated users: Read-only access to monitored projects and reviews
DROP POLICY IF EXISTS "Authenticated users can view github projects" ON public.github_projects;
CREATE POLICY "Authenticated users can view github projects"
    ON public.github_projects FOR SELECT TO authenticated USING (is_monitored = true);

DROP POLICY IF EXISTS "Authenticated users can view github reviews" ON public.github_reviews;
CREATE POLICY "Authenticated users can view github reviews"
    ON public.github_reviews FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated users can view github versions" ON public.github_versions;
CREATE POLICY "Authenticated users can view github versions"
    ON public.github_versions FOR SELECT TO authenticated USING (true);

-- Service role full access
DROP POLICY IF EXISTS "Service role full on github_projects" ON public.github_projects;
CREATE POLICY "Service role full on github_projects"
    ON public.github_projects FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full on github_reviews" ON public.github_reviews;
CREATE POLICY "Service role full on github_reviews"
    ON public.github_reviews FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full on github_versions" ON public.github_versions;
CREATE POLICY "Service role full on github_versions"
    ON public.github_versions FOR ALL TO service_role USING (true) WITH CHECK (true);
