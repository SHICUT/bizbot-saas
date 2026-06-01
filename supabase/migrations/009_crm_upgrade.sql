-- ============================================================================
-- CRM UPGRADE
-- Lead value, notes, timeline, customer profiles
-- ============================================================================

-- Lead enhancements
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS estimated_value INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

-- Lead notes
CREATE TABLE IF NOT EXISTS public.lead_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_by TEXT DEFAULT 'owner',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_notes ON public.lead_notes(lead_id, created_at DESC);
ALTER TABLE public.lead_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own lead notes" ON public.lead_notes FOR ALL
    USING (business_id = public.get_user_business_id());

-- Lead timeline events
CREATE TABLE IF NOT EXISTS public.lead_timeline (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- first_contact | message | appointment_booked | appointment_completed | converted | note_added
    description TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_timeline ON public.lead_timeline(lead_id, created_at DESC);
ALTER TABLE public.lead_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own timeline" ON public.lead_timeline FOR ALL
    USING (business_id = public.get_user_business_id());
