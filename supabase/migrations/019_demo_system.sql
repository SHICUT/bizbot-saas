-- ============================================================================
-- DEMO SYSTEM — Isolated demo data support
-- ============================================================================

-- Add demo flags to core tables
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.conversations ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS is_demo BOOLEAN DEFAULT false;

-- Index for fast demo data filtering
CREATE INDEX IF NOT EXISTS idx_businesses_demo ON public.businesses(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_leads_demo ON public.leads(is_demo) WHERE is_demo = true;
CREATE INDEX IF NOT EXISTS idx_conversations_demo ON public.conversations(is_demo) WHERE is_demo = true;
