-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — RADAR, INFRASTRUCTURE & GOVERNANCE MIGRATION
-- Migration: 20260917000004_radar_infra_governance.sql
-- Description: GitHub Radar (projects, reviews, versions), Infrastructure (nodes, 
--              node_heartbeats), and Governance (audit_logs).
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. GITHUB RADAR (Ecosystem Codebase Monitoring)
-- -----------------------------------------------------------------------------

-- 1.1 GitHub Projects
CREATE TABLE IF NOT EXISTS public.github_projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    repo_name TEXT UNIQUE NOT NULL,
    repo_url TEXT NOT NULL,
    default_branch TEXT NOT NULL DEFAULT 'main',
    is_monitored BOOLEAN NOT NULL DEFAULT true,
    last_scanned_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.github_projects IS 'Monitored GitHub repositories in the ecosystem';

-- 1.2 GitHub Reviews (Automated security & quality audits)
CREATE TABLE IF NOT EXISTS public.github_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.github_projects(id) ON DELETE CASCADE,
    commit_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'approved', 'changes_requested', 'rejected')),
    summary TEXT,
    findings JSONB NOT NULL DEFAULT '[]'::jsonb,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    reviewed_by TEXT NOT NULL DEFAULT 'Antigravity Code Guardian',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.github_reviews IS 'Automated code review reports and vulnerability findings';

CREATE INDEX IF NOT EXISTS idx_github_reviews_project ON public.github_reviews (project_id, created_at DESC);

-- 1.3 GitHub Versions (Release tags and changelogs)
CREATE TABLE IF NOT EXISTS public.github_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.github_projects(id) ON DELETE CASCADE,
    tag_name TEXT NOT NULL,
    commit_sha TEXT NOT NULL,
    release_notes TEXT,
    published_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_project_version UNIQUE (project_id, tag_name)
);

COMMENT ON TABLE public.github_versions IS 'Repository releases, tags, and milestone versions';

CREATE INDEX IF NOT EXISTS idx_github_versions_project ON public.github_versions (project_id, published_at DESC);

-- -----------------------------------------------------------------------------
-- 2. INFRASTRUCTURE (On-Premises Dell M4800 & Cloud Workers)
-- -----------------------------------------------------------------------------

-- 2.1 Nodes Table (Physical and Virtual AI Workers)
CREATE TABLE IF NOT EXISTS public.nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    hostname TEXT,
    ip_address TEXT,
    status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'offline', 'busy', 'draining', 'error')),
    capabilities TEXT[] NOT NULL DEFAULT '{}',
    max_concurrency INTEGER NOT NULL DEFAULT 2,
    current_load INTEGER NOT NULL DEFAULT 0,
    system_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_heartbeat_at TIMESTAMPTZ,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.nodes IS 'Compute nodes including on-prem Dell Precision M4800 (huy-ai-node-01)';

CREATE INDEX IF NOT EXISTS idx_nodes_status ON public.nodes (status);

-- 2.2 Node Heartbeats (Telemetry History)
CREATE TABLE IF NOT EXISTS public.node_heartbeats (
    id BIGSERIAL PRIMARY KEY,
    node_id TEXT NOT NULL REFERENCES public.nodes(node_id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    current_load INTEGER NOT NULL DEFAULT 0,
    cpu_usage_pct NUMERIC(5, 2),
    ram_used_bytes BIGINT,
    ram_total_bytes BIGINT,
    system_specs JSONB NOT NULL DEFAULT '{}'::jsonb,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.node_heartbeats IS 'Time-series telemetry log of node load, RAM, and CPU usage';

CREATE INDEX IF NOT EXISTS idx_node_heartbeats_node_time ON public.node_heartbeats (node_id, recorded_at DESC);

-- -----------------------------------------------------------------------------
-- 3. GOVERNANCE (Tamper-Evident Security Audit Logs)
-- -----------------------------------------------------------------------------

-- 3.1 Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    previous_data JSONB,
    new_data JSONB,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.audit_logs IS 'Append-only audit log tracking security, billing, and administrative actions';

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_profile_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_org ON public.audit_logs (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs (action, created_at DESC);

-- -----------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.github_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.github_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_heartbeats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- GitHub Radar: Authenticated users can view monitored projects and reviews
CREATE POLICY "Authenticated users can view github projects"
    ON public.github_projects FOR SELECT TO authenticated USING (is_monitored = true);

CREATE POLICY "Authenticated users can view github reviews"
    ON public.github_reviews FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can view github versions"
    ON public.github_versions FOR SELECT TO authenticated USING (true);

-- Nodes: Authenticated can view node status (safe metadata only)
CREATE POLICY "Authenticated users can view compute nodes"
    ON public.nodes FOR SELECT TO authenticated USING (true);

-- Node Heartbeats: Read-only for authenticated
CREATE POLICY "Authenticated users can view node telemetry"
    ON public.node_heartbeats FOR SELECT TO authenticated USING (true);

-- Audit Logs: Members can view logs of their own organization; Users can view their own actor logs
CREATE POLICY "Users can view relevant audit logs"
    ON public.audit_logs FOR SELECT TO authenticated
    USING (
        actor_profile_id = auth.uid() OR
        (organization_id IS NOT NULL AND public.is_org_member(organization_id, ARRAY['owner', 'admin']))
    );

-- Full access for service_role
CREATE POLICY "Service role full on github_projects" ON public.github_projects FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full on github_reviews" ON public.github_reviews FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full on github_versions" ON public.github_versions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full on nodes" ON public.nodes FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full on node_heartbeats" ON public.node_heartbeats FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full on audit_logs" ON public.audit_logs FOR ALL TO service_role USING (true);
