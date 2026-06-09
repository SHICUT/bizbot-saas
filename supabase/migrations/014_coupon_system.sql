-- ============================================================================
-- COUPON SYSTEM
-- Supports percentage and fixed discount coupons with plan restrictions,
-- usage limits, and expiry dates.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
    discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
    is_active BOOLEAN DEFAULT true,
    usage_limit INTEGER DEFAULT NULL,       -- NULL = unlimited
    usage_count INTEGER DEFAULT 0,
    expires_at TIMESTAMPTZ DEFAULT NULL,    -- NULL = never expires
    applicable_plans TEXT[] DEFAULT NULL,   -- NULL = all plans, e.g. {'starter','growth','business'}
    min_amount NUMERIC(10,2) DEFAULT 0,    -- Minimum order amount for coupon to apply
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Coupon redemption history
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active ON public.coupons(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon ON public.coupon_redemptions(coupon_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_business ON public.coupon_redemptions(business_id);

-- Updated_at trigger
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.coupons
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- Only admins can manage coupons (service role bypasses RLS)
-- Users can validate coupons via API (which uses admin client)

-- ============================================================================
-- SEED DEFAULT COUPONS
-- ============================================================================

INSERT INTO public.coupons (code, description, discount_type, discount_value, is_active, applicable_plans)
VALUES
    ('INDIA40', '40% Off for India — All Plans', 'percentage', 40, true, NULL),
    ('INDIASTART', '50% Off Starter Plan Only — India', 'percentage', 50, true, '{starter}')
ON CONFLICT (code) DO NOTHING;


-- ============================================================================
-- RPC: Increment coupon usage atomically
-- ============================================================================

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


-- ============================================================================
-- ADD metadata column to payments table for coupon tracking
-- ============================================================================

ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;
