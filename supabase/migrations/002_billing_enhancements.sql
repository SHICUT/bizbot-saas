-- ============================================================================
-- BILLING ENHANCEMENTS
-- Adds support for Razorpay + Stripe, yearly plans, invoices
-- ============================================================================

-- Add billing columns to subscriptions
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly', -- monthly | yearly
  ADD COLUMN IF NOT EXISTS amount INTEGER, -- amount in paise (₹999 = 99900)
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'razorpay', -- razorpay | stripe
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
  ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end BOOLEAN DEFAULT false;

-- Add Stripe columns to payments
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'razorpay', -- razorpay | stripe
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_invoice_id TEXT,
  ADD COLUMN IF NOT EXISTS invoice_url TEXT,
  ADD COLUMN IF NOT EXISTS invoice_pdf TEXT;

-- Invoices table (for both Razorpay and Stripe)
CREATE TABLE IF NOT EXISTS public.invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,

    -- Invoice details
    invoice_number TEXT NOT NULL,
    provider TEXT DEFAULT 'razorpay', -- razorpay | stripe
    provider_invoice_id TEXT, -- razorpay/stripe invoice ID

    -- Amounts (in paise for INR, cents for USD)
    subtotal INTEGER NOT NULL,
    tax INTEGER DEFAULT 0, -- GST
    total INTEGER NOT NULL,
    currency TEXT DEFAULT 'INR',

    -- Status
    status TEXT DEFAULT 'paid', -- draft | open | paid | void | uncollectible

    -- Period
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,

    -- URLs
    hosted_url TEXT, -- link to view invoice
    pdf_url TEXT, -- link to download PDF

    -- Metadata
    line_items JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,

    -- Timestamps
    issued_at TIMESTAMPTZ DEFAULT now(),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_invoices_business ON public.invoices(business_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_subscription ON public.invoices(subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON public.subscriptions(stripe_subscription_id)
    WHERE stripe_subscription_id IS NOT NULL;

-- RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own invoices"
    ON public.invoices FOR SELECT
    USING (business_id = public.get_user_business_id());

-- Plan configuration table (defines available plans)
CREATE TABLE IF NOT EXISTS public.plans (
    id TEXT PRIMARY KEY, -- starter_monthly, pro_yearly, etc.
    name TEXT NOT NULL,
    description TEXT,
    tier TEXT NOT NULL, -- starter | pro | business
    billing_cycle TEXT NOT NULL, -- monthly | yearly
    amount INTEGER NOT NULL, -- in paise
    currency TEXT DEFAULT 'INR',
    message_limit INTEGER NOT NULL,
    features JSONB DEFAULT '[]'::jsonb,
    razorpay_plan_id TEXT,
    stripe_price_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed plans
INSERT INTO public.plans (id, name, description, tier, billing_cycle, amount, currency, message_limit, features) VALUES
    ('starter_monthly', 'Starter Monthly', 'For small businesses getting started', 'starter', 'monthly', 79900, 'INR', 1000, '["AI auto-reply", "Lead capture", "Conversation inbox", "Email support"]'::jsonb),
    ('starter_yearly', 'Starter Yearly', 'For small businesses (save 20%)', 'starter', 'yearly', 767000, 'INR', 1000, '["AI auto-reply", "Lead capture", "Conversation inbox", "Email support", "2 months free"]'::jsonb),
    ('pro_monthly', 'Pro Monthly', 'For growing businesses', 'pro', 'monthly', 199900, 'INR', 5000, '["Everything in Starter", "Appointment booking", "Follow-up sequences", "Priority support", "Analytics"]'::jsonb),
    ('pro_yearly', 'Pro Yearly', 'For growing businesses (save 20%)', 'pro', 'yearly', 1919000, 'INR', 5000, '["Everything in Starter", "Appointment booking", "Follow-up sequences", "Priority support", "Analytics", "2 months free"]'::jsonb),
    ('business_monthly', 'Business Monthly', 'For high-volume businesses', 'business', 'monthly', 399900, 'INR', 20000, '["Everything in Pro", "20000 messages/month", "Custom AI training", "Multi-agent", "Dedicated manager", "Fair usage policy"]'::jsonb),
    ('business_yearly', 'Business Yearly', 'For high-volume businesses (save 20%)', 'business', 'yearly', 3839000, 'INR', 20000, '["Everything in Pro", "20000 messages/month", "Custom AI training", "Multi-agent", "Dedicated manager", "Fair usage policy", "2 months free"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
