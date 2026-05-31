-- ============================================================================
-- APPOINTMENTS MODULE UPGRADE
-- Calendar, availability, revenue tracking, reminders
-- ============================================================================

-- Add revenue and availability fields to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS price INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS customer_email TEXT,
  ADD COLUMN IF NOT EXISTS reschedule_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancelled_reason TEXT,
  ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_channel TEXT DEFAULT 'whatsapp';

-- Business availability slots
CREATE TABLE IF NOT EXISTS public.business_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL, -- 0=Sun, 1=Mon, ..., 6=Sat
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration INTEGER DEFAULT 60, -- minutes
    max_bookings_per_slot INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_availability_business ON public.business_availability(business_id, day_of_week);
ALTER TABLE public.business_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own availability" ON public.business_availability FOR ALL
    USING (business_id = public.get_user_business_id());

-- Blocked dates (holidays, off days)
CREATE TABLE IF NOT EXISTS public.blocked_dates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    blocked_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own blocked dates" ON public.blocked_dates FOR ALL
    USING (business_id = public.get_user_business_id());
