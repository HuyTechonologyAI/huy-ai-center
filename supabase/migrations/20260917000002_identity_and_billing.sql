-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — IDENTITY & BILLING SCHEMA MIGRATION
-- Migration: 20260917000002_identity_and_billing.sql
-- Description: Multi-tenant Identity (profiles, organizations, members) 
--              and Billing (plans, subscriptions, credit wallets, transactions).
-- ==============================================================================

-- -----------------------------------------------------------------------------
-- 1. IDENTITY & MULTI-TENANCY
-- -----------------------------------------------------------------------------

-- 1.1 Profiles Table (Linked to Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    account_type TEXT NOT NULL DEFAULT 'individual' CHECK (account_type IN ('individual', 'organization', 'school', 'business')),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.profiles IS 'User profiles linked to Supabase Auth identity';

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_account_type ON public.profiles (account_type);

-- 1.2 Organizations Table (Tenant entity: School, Business, or General Org)
CREATE TABLE IF NOT EXISTS public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'organization' CHECK (type IN ('organization', 'school', 'business')),
    description TEXT,
    logo_url TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.organizations IS 'Tenant organizations (Schools, Businesses, Partners)';

CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations (slug);
CREATE INDEX IF NOT EXISTS idx_organizations_type ON public.organizations (type);

-- 1.3 Organization Members Table (RBAC within Tenant)
CREATE TABLE IF NOT EXISTS public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'guest')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_organization_member UNIQUE (organization_id, profile_id)
);

COMMENT ON TABLE public.organization_members IS 'Membership and roles mapping profiles to organizations';

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members (organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_profile_id ON public.organization_members (profile_id);

-- -----------------------------------------------------------------------------
-- 2. BILLING & CREDIT WALLETS
-- -----------------------------------------------------------------------------

-- 2.1 Plans Table
CREATE TABLE IF NOT EXISTS public.plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price_monthly NUMERIC(12, 2) NOT NULL DEFAULT 0,
    credits_included INTEGER NOT NULL DEFAULT 1000,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.plans IS 'Service tiers and pricing packages';

-- 2.2 Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'trialing' CHECK (status IN ('active', 'past_due', 'canceled', 'trialing', 'paused')),
    current_period_start TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_subscription_target CHECK (
        (organization_id IS NOT NULL AND profile_id IS NULL) OR
        (organization_id IS NULL AND profile_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.subscriptions IS 'Active customer subscriptions tied to Organization or Profile';

CREATE INDEX IF NOT EXISTS idx_subscriptions_org ON public.subscriptions (organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_profile ON public.subscriptions (profile_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions (status);

-- 2.3 Credit Wallets Table (AI computation token bank)
CREATE TABLE IF NOT EXISTS public.credit_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    balance NUMERIC(15, 4) NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency TEXT NOT NULL DEFAULT 'CREDIT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_wallet_owner CHECK (
        (organization_id IS NOT NULL AND profile_id IS NULL) OR
        (organization_id IS NULL AND profile_id IS NOT NULL)
    )
);

COMMENT ON TABLE public.credit_wallets IS 'Credit balance for executing AI tasks and tokens';

-- 2.4 Credit Transactions Table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
    amount NUMERIC(15, 4) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('deposit', 'usage', 'refund', 'bonus')),
    task_id UUID,
    description TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.credit_transactions IS 'Ledger of all credit additions and AI consumption events';

CREATE INDEX IF NOT EXISTS idx_credit_tx_wallet_id ON public.credit_transactions (wallet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tx_task_id ON public.credit_transactions (task_id) WHERE task_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY (RLS) POLICIES
-- -----------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

-- Helper function: check if authenticated user belongs to organization with required roles
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID, required_roles TEXT[] DEFAULT ARRAY['owner', 'admin', 'member'])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.organization_members
        WHERE organization_id = org_id
          AND profile_id = auth.uid()
          AND role = ANY(required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Profiles: Users can view & edit their own profile; public can read basic info
CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- Organizations: Members can view their organizations
CREATE POLICY "Members can view their organization"
    ON public.organizations FOR SELECT TO authenticated
    USING (public.is_org_member(id));

CREATE POLICY "Admins can update their organization"
    ON public.organizations FOR UPDATE TO authenticated
    USING (public.is_org_member(id, ARRAY['owner', 'admin']))
    WITH CHECK (public.is_org_member(id, ARRAY['owner', 'admin']));

-- Organization Members: Members can view who is in their org
CREATE POLICY "Members can view other members in org"
    ON public.organization_members FOR SELECT TO authenticated
    USING (public.is_org_member(organization_id));

-- Plans: Public readable
CREATE POLICY "Anyone can view active plans"
    ON public.plans FOR SELECT TO authenticated, anon USING (is_active = true);

-- Credit Wallets: Owners/Members can view their wallet
CREATE POLICY "Users can view personal credit wallet"
    ON public.credit_wallets FOR SELECT TO authenticated
    USING (profile_id = auth.uid() OR public.is_org_member(organization_id));

-- Credit Transactions: Read-only for wallet owners
CREATE POLICY "Users can view credit transactions"
    ON public.credit_transactions FOR SELECT TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.credit_wallets w
        WHERE w.id = credit_transactions.wallet_id
          AND (w.profile_id = auth.uid() OR public.is_org_member(w.organization_id))
    ));

-- Service role bypass on all tables
CREATE POLICY "Service role full access on profiles" ON public.profiles FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on organizations" ON public.organizations FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on organization_members" ON public.organization_members FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on plans" ON public.plans FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on subscriptions" ON public.subscriptions FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on credit_wallets" ON public.credit_wallets FOR ALL TO service_role USING (true);
CREATE POLICY "Service role full access on credit_transactions" ON public.credit_transactions FOR ALL TO service_role USING (true);
