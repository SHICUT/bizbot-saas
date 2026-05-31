-- ============================================================================
-- STRUCTURED BUSINESS KNOWLEDGE SYSTEM
-- Replaces raw text business_context with structured data
-- ============================================================================

-- Business services table
CREATE TABLE IF NOT EXISTS public.business_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price TEXT,
    duration TEXT,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_services ON public.business_services(business_id, is_active);
ALTER TABLE public.business_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own services" ON public.business_services FOR ALL
    USING (business_id = public.get_user_business_id());

-- Business plans/pricing table
CREATE TABLE IF NOT EXISTS public.business_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    price TEXT NOT NULL,
    duration TEXT DEFAULT 'month',
    features JSONB DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_plans ON public.business_plans(business_id, is_active);
ALTER TABLE public.business_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own plans" ON public.business_plans FOR ALL
    USING (business_id = public.get_user_business_id());

-- FAQ knowledge base
CREATE TABLE IF NOT EXISTS public.business_faqs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_faqs ON public.business_faqs(business_id, is_active);
ALTER TABLE public.business_faqs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own faqs" ON public.business_faqs FOR ALL
    USING (business_id = public.get_user_business_id());

-- Add structured fields to businesses table
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_link TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;
