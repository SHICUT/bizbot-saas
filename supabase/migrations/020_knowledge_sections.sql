-- Migration 020: Generic Knowledge Sections Table
-- 
-- This creates a single, scalable table for ALL business knowledge sections
-- across ALL business types (School, Gym, Clinic, Hotel, Restaurant, etc.).
--
-- Design:
--   - Each row = one section for one business
--   - section_key identifies what kind of data it is (e.g. "admissions", "transport", "menu")
--   - items is a JSONB array of structured items for that section
--   - No new tables needed when adding business types or sections
--
-- This replaces the pattern of storing everything in business_services with category tags.
-- Existing data in business_services/business_plans/business_faqs is preserved and still works.

CREATE TABLE IF NOT EXISTS knowledge_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,          -- e.g. "admissions", "transport", "uniform", "menu", "rooms"
  items JSONB NOT NULL DEFAULT '[]',  -- array of items, each item is {name, description, price, ...}
  metadata JSONB DEFAULT '{}',        -- optional metadata (section display name, icon, etc.)
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- One section per business per key
  CONSTRAINT unique_business_section UNIQUE (business_id, section_key)
);

-- Index for fast lookups by business
CREATE INDEX IF NOT EXISTS idx_knowledge_sections_business 
  ON knowledge_sections(business_id);

-- Index for looking up specific section types across businesses (admin analytics)
CREATE INDEX IF NOT EXISTS idx_knowledge_sections_key 
  ON knowledge_sections(section_key);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_knowledge_sections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_sections_updated
  BEFORE UPDATE ON knowledge_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_sections_timestamp();

-- Enable RLS
ALTER TABLE knowledge_sections ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users can only access their own business's sections
CREATE POLICY "Users can view own business sections"
  ON knowledge_sections FOR SELECT
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert own business sections"
  ON knowledge_sections FOR INSERT
  WITH CHECK (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can update own business sections"
  ON knowledge_sections FOR UPDATE
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

CREATE POLICY "Users can delete own business sections"
  ON knowledge_sections FOR DELETE
  USING (business_id IN (
    SELECT id FROM businesses WHERE owner_id = auth.uid()
  ));

-- Service role bypass (for admin/webhook operations)
CREATE POLICY "Service role full access"
  ON knowledge_sections FOR ALL
  USING (auth.role() = 'service_role');

-- Migrate existing category-based data from business_services into knowledge_sections
-- This preserves all existing data while moving to the new architecture
INSERT INTO knowledge_sections (business_id, section_key, items)
SELECT 
  business_id,
  category,
  jsonb_agg(
    jsonb_build_object(
      'name', name,
      'description', COALESCE(description, ''),
      'price', COALESCE(price, ''),
      'duration', COALESCE(duration, '')
    ) ORDER BY sort_order
  )
FROM business_services
WHERE category IS NOT NULL 
  AND category NOT IN ('service')
GROUP BY business_id, category
ON CONFLICT (business_id, section_key) DO NOTHING;

-- Also migrate plans into knowledge_sections for consistency
INSERT INTO knowledge_sections (business_id, section_key, items)
SELECT 
  business_id,
  'plans',
  jsonb_agg(
    jsonb_build_object(
      'name', name,
      'price', COALESCE(price, ''),
      'duration', COALESCE(duration, 'month'),
      'features', COALESCE(features, '[]'::jsonb),
      'is_popular', COALESCE(is_popular, false)
    ) ORDER BY sort_order
  )
FROM business_plans
GROUP BY business_id
ON CONFLICT (business_id, section_key) DO NOTHING;

-- Migrate FAQs
INSERT INTO knowledge_sections (business_id, section_key, items)
SELECT 
  business_id,
  'faqs',
  jsonb_agg(
    jsonb_build_object(
      'question', question,
      'answer', COALESCE(answer, ''),
      'category', COALESCE(category, 'general')
    ) ORDER BY sort_order
  )
FROM business_faqs
GROUP BY business_id
ON CONFLICT (business_id, section_key) DO NOTHING;
