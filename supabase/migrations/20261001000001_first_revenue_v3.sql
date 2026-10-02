-- ==============================================================================
-- HUY TECHNOLOGY AI CENTER — DATABASE MIGRATION
-- Migration: 20261001000001_first_revenue_v3.sql
-- Architecture: First Verified Paid Order V3.0
-- Module: Canonical Revenue & Evidence Layer (Leads, Consents, Orders, SePay Transactions)
-- Target: HuyAI Singapore (bdeluacbzbdflxubhpha)
-- Rules: Non-destructive, 100% additive, Idempotent, RLS enabled.
-- ==============================================================================

-- 1. FIRST REVENUE LEADS TABLE
CREATE TABLE IF NOT EXISTS public.first_revenue_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id TEXT NOT NULL DEFAULT 'FIRST-REVENUE-V3',
    name TEXT NOT NULL,
    company TEXT NOT NULL,
    role TEXT,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    problem TEXT NOT NULL,
    current_tools TEXT,
    preferred_contact_time TEXT,
    utm_source TEXT DEFAULT 'google',
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_term TEXT,
    landing_session_id TEXT,
    icp_fit TEXT DEFAULT 'PENDING' CHECK (icp_fit IN ('PENDING', 'FIT', 'NOT_FIT')),
    status TEXT NOT NULL DEFAULT 'NEW_REAL_LEAD' CHECK (status IN (
        'NEW_REAL_LEAD', 'SOURCE_VERIFIED', 'CONSENT_VERIFIED', 'ICP_CHECKED',
        'QUALIFICATION_IN_PROGRESS', 'QUALIFIED', 'AUDIT_BOOKED', 'AUDIT_COMPLETED',
        'PROPOSAL_DRAFTED', 'PROPOSAL_APPROVED', 'PROPOSAL_SENT', 'CUSTOMER_ACCEPTED',
        'PAYMENT_PENDING', 'PAID_VERIFIED', 'PILOT_DELIVERY',
        'NOT_FIT', 'DECLINED', 'NO_RESPONSE', 'CANCELLED', 'DUPLICATE', 'INVALID', 'SPAM'
    )),
    is_test BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. CONSENT RECORDS TABLE
CREATE TABLE IF NOT EXISTS public.first_revenue_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.first_revenue_leads(id) ON DELETE CASCADE,
    consent_flag BOOLEAN NOT NULL DEFAULT true,
    consent_text_version TEXT NOT NULL DEFAULT 'v3.0-2026-10',
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. EVIDENCE EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.first_revenue_evidence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_id UUID NOT NULL,
    entity_type TEXT NOT NULL,
    event_type TEXT NOT NULL,
    source TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    content_hash TEXT NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. INTERACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.first_revenue_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.first_revenue_leads(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'EMAIL',
    direction TEXT NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
    subject TEXT,
    content TEXT NOT NULL,
    external_message_id TEXT,
    is_customer_reply BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. ORDERS TABLE (Fixed SKU HUY-AUTO-PILOT-4900)
CREATE TABLE IF NOT EXISTS public.first_revenue_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID REFERENCES public.first_revenue_leads(id) ON DELETE RESTRICT,
    order_code TEXT UNIQUE NOT NULL,
    offer_id TEXT NOT NULL DEFAULT 'HUY-AUTO-PILOT-4900',
    agreed_price NUMERIC(15, 2) NOT NULL DEFAULT 4900000.00,
    currency TEXT NOT NULL DEFAULT 'VND',
    customer_accepted BOOLEAN NOT NULL DEFAULT false,
    acceptance_evidence_id UUID REFERENCES public.first_revenue_evidence_events(id),
    status TEXT NOT NULL DEFAULT 'PAYMENT_PENDING' CHECK (status IN (
        'DRAFT', 'PROPOSAL_SENT', 'CUSTOMER_ACCEPTED', 'PAYMENT_PENDING', 'PAID_VERIFIED', 'CANCELLED'
    )),
    is_test BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. SEPAY PAYMENT TRANSACTIONS TABLE
CREATE TABLE IF NOT EXISTS public.first_revenue_payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.first_revenue_orders(id) ON DELETE SET NULL,
    provider TEXT NOT NULL DEFAULT 'SEPAY',
    external_transaction_id TEXT NOT NULL,
    gateway_account TEXT,
    transfer_type TEXT DEFAULT 'in',
    transfer_amount NUMERIC(15, 2) NOT NULL,
    payment_code TEXT,
    reference_code TEXT,
    raw_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_reconciled BOOLEAN NOT NULL DEFAULT false,
    environment TEXT NOT NULL DEFAULT 'LIVE' CHECK (environment IN ('LIVE', 'TEST', 'SANDBOX')),
    counts_as_revenue BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_sepay_provider_tx UNIQUE (provider, external_transaction_id)
);

-- 7. ENABLE RLS & GRANTS
ALTER TABLE public.first_revenue_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_revenue_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_revenue_evidence_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_revenue_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_revenue_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.first_revenue_payment_transactions ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
