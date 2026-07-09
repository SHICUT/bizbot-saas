-- Migration 022: Team Members, Lead Assignments, Notifications
-- Foundation for lead assignment engine + notification system

-- 1. Team Members (sales team for a business)
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  wa_id TEXT,                          -- WhatsApp number for notifications
  role TEXT NOT NULL DEFAULT 'sales',  -- owner, manager, sales, telecaller, support
  is_active BOOLEAN NOT NULL DEFAULT true,
  assignment_weight INTEGER DEFAULT 1, -- for weighted round-robin
  specializations JSONB DEFAULT '[]',  -- ["budget:50L+", "location:Noida", "project:Green Valley"]
  leads_assigned INTEGER DEFAULT 0,
  last_assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_members_business ON team_members(business_id);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(business_id, is_active);

-- 2. Lead Assignments (who is assigned to which lead)
CREATE TABLE IF NOT EXISTS lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  assigned_by TEXT DEFAULT 'system',   -- system, manual, round_robin, budget, location, project
  assignment_reason TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,  -- false = reassigned
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assignments_lead ON lead_assignments(lead_id, is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_member ON lead_assignments(assigned_to, is_active);
CREATE INDEX IF NOT EXISTS idx_assignments_business ON lead_assignments(business_id);

-- 3. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  recipient_id UUID,                   -- team_member id (null = business owner)
  type TEXT NOT NULL,                  -- new_lead, hot_lead, qualified, site_visit, booking, cancellation, reassigned
  title TEXT NOT NULL,
  body TEXT,
  metadata JSONB DEFAULT '{}',         -- {lead_id, property_id, appointment_id, etc.}
  channels TEXT[] DEFAULT '{}',        -- channels sent via: dashboard, email, whatsapp
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_business ON notifications(business_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(business_id, type);

-- 4. Website Lead API Keys (for external lead submission)
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,              -- SHA-256 hash of the API key
  key_prefix TEXT NOT NULL,            -- first 8 chars for display (fn_xxxxxxxx)
  name TEXT NOT NULL DEFAULT 'Website',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  requests_today INTEGER DEFAULT 0,
  rate_limit INTEGER DEFAULT 100,      -- max requests per day
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_business ON api_keys(business_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);

-- RLS
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policies (service role full access for all)
CREATE POLICY "Service role team" ON team_members FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role assignments" ON lead_assignments FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role notifications" ON notifications FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role api_keys" ON api_keys FOR ALL USING (auth.role() = 'service_role');

-- Owner access
CREATE POLICY "Owner team" ON team_members FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Owner assignments" ON lead_assignments FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Owner notifications" ON notifications FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
CREATE POLICY "Owner api_keys" ON api_keys FOR ALL
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));
