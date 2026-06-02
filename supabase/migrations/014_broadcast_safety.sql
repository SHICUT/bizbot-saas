-- ============================================================================
-- BROADCAST SAFETY & COMPLIANCE
-- Opt-out tracking, daily limits, audience health
-- ============================================================================

-- Add safety columns to broadcast_campaigns
ALTER TABLE public.broadcast_campaigns
  ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS opted_out_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS outside_window_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS test_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS test_number TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_by_owner BOOLEAN DEFAULT false;

-- Opt-out tracking on leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS opted_out_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS opted_out_keyword TEXT; -- STOP | UNSUBSCRIBE | NO

-- Index for opt-out filtering
CREATE INDEX IF NOT EXISTS idx_leads_opted_out ON public.leads(business_id, opted_out) WHERE opted_out = true;

-- Daily broadcast send tracking (for rate limiting)
CREATE TABLE IF NOT EXISTS public.broadcast_daily_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    messages_sent INTEGER DEFAULT 0,
    UNIQUE(business_id, date)
);

ALTER TABLE public.broadcast_daily_stats ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users manage own broadcast stats" ON public.broadcast_daily_stats FOR ALL
    USING (business_id = public.get_user_business_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
