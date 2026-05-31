-- ============================================================================
-- ENTERPRISE FEATURES
-- Lead scoring, follow-ups, offers, reviews, broadcasts, media
-- ============================================================================

-- Lead scoring fields
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS lead_temperature TEXT DEFAULT 'cold', -- hot | warm | cold
  ADD COLUMN IF NOT EXISTS interested_services TEXT[],
  ADD COLUMN IF NOT EXISTS last_visit_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_visits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_spent INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Follow-up queue
CREATE TABLE IF NOT EXISTS public.follow_up_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ NOT NULL,
    message_type TEXT DEFAULT 'reminder', -- reminder | offer | check_in | review
    message_template TEXT,
    status TEXT DEFAULT 'pending', -- pending | sent | cancelled
    attempt_number INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_follow_up_queue ON public.follow_up_queue(business_id, status, scheduled_at);
ALTER TABLE public.follow_up_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own follow-ups" ON public.follow_up_queue FOR ALL
    USING (business_id = public.get_user_business_id());

-- Offers/Promotions
CREATE TABLE IF NOT EXISTS public.business_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    discount_type TEXT DEFAULT 'percentage', -- percentage | flat | freebie
    discount_value INTEGER DEFAULT 0,
    valid_from TIMESTAMPTZ DEFAULT now(),
    valid_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    auto_promote BOOLEAN DEFAULT true, -- AI mentions this in conversations
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.business_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own offers" ON public.business_offers FOR ALL
    USING (business_id = public.get_user_business_id());

-- Customer reviews
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    lead_id UUID REFERENCES public.leads(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    collected_via TEXT DEFAULT 'whatsapp', -- whatsapp | manual
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reviews" ON public.reviews FOR ALL
    USING (business_id = public.get_user_business_id());

-- Media knowledge base
CREATE TABLE IF NOT EXISTS public.business_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- price_chart | menu | brochure | offer | certificate | gallery
    url TEXT NOT NULL,
    trigger_keywords TEXT[], -- AI sends this when these keywords are detected
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.business_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own media" ON public.business_media FOR ALL
    USING (business_id = public.get_user_business_id());

-- Broadcast campaigns
CREATE TABLE IF NOT EXISTS public.broadcast_campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    message TEXT NOT NULL,
    target_audience TEXT DEFAULT 'all', -- all | leads | customers | expired_trials
    status TEXT DEFAULT 'draft', -- draft | scheduled | sending | sent
    scheduled_at TIMESTAMPTZ,
    sent_count INTEGER DEFAULT 0,
    delivered_count INTEGER DEFAULT 0,
    read_count INTEGER DEFAULT 0,
    replied_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.broadcast_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own campaigns" ON public.broadcast_campaigns FOR ALL
    USING (business_id = public.get_user_business_id());

-- Conversation insights
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS buying_intent TEXT DEFAULT 'unknown', -- high | medium | low | unknown
  ADD COLUMN IF NOT EXISTS urgency TEXT DEFAULT 'normal', -- urgent | normal | low
  ADD COLUMN IF NOT EXISTS competitor_mentioned BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_to_human BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;
