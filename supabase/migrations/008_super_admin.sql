-- ============================================================================
-- SUPER ADMIN ARCHITECTURE
-- Multi-tenant with platform-level admin access
-- ============================================================================

-- Admin users table (FlowNex platform owners)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT DEFAULT 'super_admin', -- super_admin | support | viewer
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

-- Admin notes on businesses (internal, invisible to business owners)
CREATE TABLE IF NOT EXISTS public.admin_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL REFERENCES auth.users(id),
    note TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Platform analytics (aggregated stats)
CREATE TABLE IF NOT EXISTS public.platform_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    total_businesses INTEGER DEFAULT 0,
    active_businesses INTEGER DEFAULT 0,
    trial_users INTEGER DEFAULT 0,
    paid_users INTEGER DEFAULT 0,
    total_leads INTEGER DEFAULT 0,
    total_messages INTEGER DEFAULT 0,
    total_appointments INTEGER DEFAULT 0,
    monthly_revenue INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(date)
);

-- No RLS on admin tables (only accessed via service role)
-- Business owners never query these tables directly

-- Helper function: check if user is super admin
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
    );
$$;
