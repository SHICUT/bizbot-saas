-- ============================================================================
-- APPOINTMENTS UPGRADE
-- Add customer details, separate date/time, staff, pricing
-- ============================================================================

-- Add new columns to appointments
ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS customer_name TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ADD COLUMN IF NOT EXISTS appointment_date DATE,
  ADD COLUMN IF NOT EXISTS appointment_time TEXT,
  ADD COLUMN IF NOT EXISTS service_price INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS staff_assigned TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual';

-- Make lead_id optional (manual appointments may not have a lead)
ALTER TABLE public.appointments ALTER COLUMN lead_id DROP NOT NULL;

-- Backfill appointment_date and appointment_time from scheduled_at
UPDATE public.appointments
SET
  appointment_date = (scheduled_at AT TIME ZONE 'Asia/Kolkata')::date,
  appointment_time = to_char(scheduled_at AT TIME ZONE 'Asia/Kolkata', 'HH24:MI'),
  customer_name = COALESCE(customer_name, title)
WHERE appointment_date IS NULL AND scheduled_at IS NOT NULL;

-- Add rescheduled status support (already text field, just documenting)
-- Valid statuses: pending | confirmed | completed | cancelled | no_show | rescheduled

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(business_id, appointment_date);

-- ============================================================================
-- LEAD SOURCE TRACKING
-- ============================================================================

-- Add source options to leads if not exists
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- ============================================================================
-- APPOINTMENT REMINDERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.appointment_reminders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    appointment_id UUID NOT NULL REFERENCES public.appointments(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL, -- 24h | 1h | 15min
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reminders_pending ON public.appointment_reminders(scheduled_for)
    WHERE sent = false;

ALTER TABLE public.appointment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own reminders" ON public.appointment_reminders FOR ALL
    USING (business_id = public.get_user_business_id());
