-- ============================================================================
-- SUPER ADMIN PANEL SYSTEM
-- Soft delete, role management, enhanced audit logs
-- ============================================================================

-- 1. Soft Delete columns on businesses
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS deleted_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'; -- active | suspended | deleted

-- 2. Admin roles table
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'support')),
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id)
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- 3. Enhanced audit logs (add more fields)
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS target_user_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ip_address TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'info'; -- info | warning | critical

-- 4. Index for soft-deleted businesses
CREATE INDEX IF NOT EXISTS idx_businesses_status ON public.businesses(status) WHERE status != 'deleted';
CREATE INDEX IF NOT EXISTS idx_businesses_deleted ON public.businesses(deleted_at) WHERE deleted_at IS NOT NULL;

-- 5. Update existing businesses to have status = 'active'
UPDATE public.businesses SET status = 'active' WHERE status IS NULL;
