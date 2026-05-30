-- ============================================================================
-- ONBOARDING ENHANCEMENTS
-- Adds fields for multi-step onboarding flow
-- ============================================================================

ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS website TEXT,
  ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_personality TEXT DEFAULT 'friendly',
  ADD COLUMN IF NOT EXISTS lead_collection JSONB DEFAULT '{"name": true, "phone": true, "email": true, "appointment_date": false}'::jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 0;
