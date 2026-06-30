-- Migration 020: Generic Knowledge Sections Table
--
-- Creates a scalable, schema-less knowledge storage for ALL business types.
-- No new tables needed when adding School, Hotel, or any future business type.
--
-- Design:
--   knowledge_sections (business_id, section_key, items JSONB)
--   - One row per section per business
--   - section_key = "admissions", "transport", "services", "plans", etc.
--   - items = JSON array of structured objects [{name, description, price, ...}]
--
-- This migration is idempotent — safe to run multiple times.
-- Does NOT depend on any other tables existing.
-- Does NOT assume business_services, business_plans, or business_faqs exist.

-- 1. Create the table (if not exists)
CREATE TABLE IF NOT EXISTS knowledge_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  section_key TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT unique_business_section UNIQUE (business_id, section_key)
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_knowledge_sections_business
  ON knowledge_sections(business_id);

CREATE INDEX IF NOT EXISTS idx_knowledge_sections_key
  ON knowledge_sections(section_key);

-- 3. Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_knowledge_sections_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to make this idempotent
DROP TRIGGER IF EXISTS knowledge_sections_updated ON knowledge_sections;

CREATE TRIGGER knowledge_sections_updated
  BEFORE UPDATE ON knowledge_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_sections_timestamp();

-- 4. Row Level Security
ALTER TABLE knowledge_sections ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if re-running
DROP POLICY IF EXISTS "Users can view own business sections" ON knowledge_sections;
DROP POLICY IF EXISTS "Users can insert own business sections" ON knowledge_sections;
DROP POLICY IF EXISTS "Users can update own business sections" ON knowledge_sections;
DROP POLICY IF EXISTS "Users can delete own business sections" ON knowledge_sections;
DROP POLICY IF EXISTS "Service role full access" ON knowledge_sections;

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

CREATE POLICY "Service role full access"
  ON knowledge_sections FOR ALL
  USING (auth.role() = 'service_role');
