-- ============================================================================
-- ADD MISSING BUSINESS COLUMNS
-- Run this in Supabase SQL Editor to fix Knowledge Base save errors.
-- Safe to run multiple times (uses IF NOT EXISTS).
-- ============================================================================

-- Add columns from migration 005 (structured knowledge fields)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS owner_name TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_number TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_link TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

-- Add description column (was missing from 001)
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Add website column
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS website TEXT;

-- Add AI personality fields from onboarding
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS ai_personality TEXT DEFAULT 'professional',
  ADD COLUMN IF NOT EXISTS ai_tone_override TEXT,
  ADD COLUMN IF NOT EXISTS services JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS lead_collection JSONB DEFAULT '{}'::jsonb;

-- Add review link for review collection automation
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS google_review_link TEXT;

-- Add knowledge_json JSONB as fallback storage when structured tables don't exist
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS knowledge_json JSONB DEFAULT '{}'::jsonb;

-- Create business knowledge tables if not exists (migration 005)
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
DO $$ BEGIN
  CREATE POLICY "Users can manage own services" ON public.business_services FOR ALL
    USING (business_id = public.get_user_business_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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
DO $$ BEGIN
  CREATE POLICY "Users can manage own plans" ON public.business_plans FOR ALL
    USING (business_id = public.get_user_business_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

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
DO $$ BEGIN
  CREATE POLICY "Users can manage own faqs" ON public.business_faqs FOR ALL
    USING (business_id = public.get_user_business_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Business media table
CREATE TABLE IF NOT EXISTS public.business_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'general',
    url TEXT NOT NULL,
    trigger_keywords TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_business_media ON public.business_media(business_id, is_active);
ALTER TABLE public.business_media ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY "Users can manage own media" ON public.business_media FOR ALL
    USING (business_id = public.get_user_business_id());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add category column to business_services (for trainers, facilities)
ALTER TABLE public.business_services
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'service';
