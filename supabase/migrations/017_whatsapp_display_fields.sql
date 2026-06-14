-- ============================================================================
-- WHATSAPP DISPLAY FIELDS & ADMIN OVERVIEW
-- Stores human-readable phone number and owner email for easy identification
-- ============================================================================

-- Add display phone number column
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS whatsapp_phone_number TEXT;

-- Add owner_email for quick identification without joining auth.users
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS owner_email TEXT;

-- Backfill owner_email from auth.users
UPDATE public.businesses b
SET owner_email = u.email
FROM auth.users u
WHERE b.owner_id = u.id AND b.owner_email IS NULL;

-- ============================================================================
-- ADMIN VIEW: business_whatsapp_overview
-- Shows all businesses with their WhatsApp connection status at a glance
-- ============================================================================

CREATE OR REPLACE VIEW public.business_whatsapp_overview AS
SELECT
  b.id,
  b.name AS business_name,
  b.owner_email,
  b.whatsapp_phone_number,
  b.whatsapp_phone_number_id,
  b.whatsapp_business_account_id,
  b.whatsapp_connected,
  b.whatsapp_connected_at,
  b.is_active,
  b.plan,
  b.type AS business_type,
  b.created_at
FROM public.businesses b
ORDER BY b.created_at DESC;
