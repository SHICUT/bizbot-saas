-- Migration 021: Properties table for Real Estate businesses
-- Stores structured property/project data for AI recommendations and media sharing.

CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  tower TEXT,
  unit_number TEXT,
  property_type TEXT NOT NULL DEFAULT 'flat',  -- flat, villa, plot, commercial, office, penthouse
  bhk TEXT,                                     -- 1BHK, 2BHK, 3BHK, 4BHK, studio
  carpet_area TEXT,
  super_builtup_area TEXT,

  -- Pricing
  price_min BIGINT,                             -- in INR (paise-free, full rupees)
  price_max BIGINT,
  price_display TEXT,                           -- "₹45L - ₹65L" for display
  booking_amount TEXT,
  payment_plans JSONB DEFAULT '[]'::jsonb,      -- [{name, amount, schedule}]

  -- Status
  status TEXT NOT NULL DEFAULT 'available',     -- available, hold, sold, upcoming
  possession_date TEXT,
  rera_number TEXT,
  builder_name TEXT,

  -- Location
  address TEXT,
  city TEXT,
  area TEXT,                                    -- locality/sector
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  google_maps_link TEXT,

  -- Media (URLs)
  images JSONB DEFAULT '[]'::jsonb,             -- [{url, caption}]
  floor_plans JSONB DEFAULT '[]'::jsonb,        -- [{url, caption, bhk}]
  brochure_url TEXT,
  videos JSONB DEFAULT '[]'::jsonb,             -- [{url, caption}]

  -- Features
  amenities JSONB DEFAULT '[]'::jsonb,          -- ["Swimming Pool", "Gym", "Clubhouse"]
  nearby JSONB DEFAULT '{}'::jsonb,             -- {schools: [...], hospitals: [...], metro: [...]}
  highlights JSONB DEFAULT '[]'::jsonb,         -- ["Corner Unit", "Park Facing"]
  description TEXT,

  -- Metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_properties_business ON properties(business_id);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(business_id, status);
CREATE INDEX IF NOT EXISTS idx_properties_type ON properties(business_id, property_type);
CREATE INDEX IF NOT EXISTS idx_properties_price ON properties(business_id, price_min, price_max);
CREATE INDEX IF NOT EXISTS idx_properties_city ON properties(business_id, city);
CREATE INDEX IF NOT EXISTS idx_properties_area ON properties(business_id, area);

-- Timestamp trigger
DROP TRIGGER IF EXISTS properties_updated ON properties;
CREATE TRIGGER properties_updated
  BEFORE UPDATE ON properties
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_sections_timestamp();

-- RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own properties" ON properties;
DROP POLICY IF EXISTS "Users can insert own properties" ON properties;
DROP POLICY IF EXISTS "Users can update own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete own properties" ON properties;
DROP POLICY IF EXISTS "Service role properties access" ON properties;

CREATE POLICY "Users can view own properties" ON properties FOR SELECT
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Users can insert own properties" ON properties FOR INSERT
  WITH CHECK (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Users can update own properties" ON properties FOR UPDATE
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Users can delete own properties" ON properties FOR DELETE
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Service role properties access" ON properties FOR ALL
  USING (auth.role() = 'service_role');
