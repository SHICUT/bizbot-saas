-- ============================================================================
-- REVENUE & AI UPGRADE
-- Review collection, white-label foundation, AI confidence tracking
-- ============================================================================

-- Review collection for appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS review_sent BOOLEAN DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS review_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_rating INTEGER;

-- Google review link for businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS google_review_link TEXT,
  ADD COLUMN IF NOT EXISTS additional_notes TEXT;

-- White-label foundation (future premium feature)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS custom_brand_name TEXT,
  ADD COLUMN IF NOT EXISTS custom_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS custom_primary_color TEXT,
  ADD COLUMN IF NOT EXISTS custom_domain TEXT;

-- AI confidence tracking on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS ai_confidence REAL,
  ADD COLUMN IF NOT EXISTS ai_intent TEXT;

-- Revenue tracking on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS revenue_generated INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversion_date TIMESTAMPTZ;

-- Index for review cron
CREATE INDEX IF NOT EXISTS idx_appointments_review ON public.appointments(status, updated_at)
    WHERE review_sent IS NULL AND status = 'completed';
