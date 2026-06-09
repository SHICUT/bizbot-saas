-- ============================================================================
-- COUPON SYSTEM (Fully Admin-Managed)
--
-- All coupons are created, edited, and managed from the admin panel.
-- No hardcoded coupon codes exist in application logic.
-- This migration creates the schema only — admins seed coupons via UI.
-- ============================================================================

-- ─── Coupons Table ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    is_active BOOLEAN DEFAULT true,
    usage_limit INTEGER DEFAULT NULL,          -- Total max redemptions (NULL = unlimited)
    per_user_limit INTEGER DEFAULT 1,          -- Max uses per business (1 = one-time, NULL = unlimited)
    usage_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT NULL,       -- NULL = never expires
    applicable_plans TEXT[] DEFAULT NULL,      -- NULL = all plans, e.g. {'starter','growth','business'}
    min_amount NUMERIC(10,2) DEFAULT 0,       -- Minimum order amount to apply
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Coupon Redemption History ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coupon_id UUID NOT NULL REFERENCES public.coupons(id) ON DELETE CASCADE,
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL,
    original_amount NUMERIC(10,2) NOT NULL,
    discount_amount NUMERIC(10,2) NOT NULL,
    final_amount NUMERIC(10,2) NOT NULL,
    redeemed_at TIMESTAMPTZ DEFAULT now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_business ON public.coupon_redemptions(business_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_unique ON public.coupon_redemptions(coupon_id, business_id);

-- ─── Trigger ────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.coupons
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Row Level Security ─────────────────────────────────────────────────────

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Service role (used by admin API) bypasses RLS automatically.
-- No user-facing policies needed — all access goes through server API.

-- ─── RPC Functions ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_coupon_usage(p_coupon_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.coupons
    SET usage_count = usage_count + 1, updated_at = now()
    WHERE id = p_coupon_id;
END;
$$;

-- ─── Payments Metadata Column ───────────────────────────────────────────────

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;
