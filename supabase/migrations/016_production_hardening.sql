-- ============================================================================
-- PRODUCTION HARDENING
-- Adds unique constraints, missing indexes, and data integrity rules
-- Safe to run multiple times (all IF NOT EXISTS)
-- ============================================================================

-- 1. Unique constraint: one phone_number_id per business (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_businesses_unique_phone_number
  ON public.businesses(whatsapp_phone_number_id)
  WHERE whatsapp_phone_number_id IS NOT NULL;

-- 2. Index for webhook lookup (the most critical query path)
CREATE INDEX IF NOT EXISTS idx_businesses_wa_lookup
  ON public.businesses(whatsapp_phone_number_id, is_active)
  WHERE whatsapp_phone_number_id IS NOT NULL AND is_active = true;

-- 3. Ensure lead_timeline has proper indexes
CREATE INDEX IF NOT EXISTS idx_lead_timeline_business
  ON public.lead_timeline(business_id, created_at DESC);

-- 4. Index for coupon redemption per-user limit check
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_check
  ON public.coupon_redemptions(coupon_id, business_id);

-- 5. Ensure messages table has composite index for conversation history
CREATE INDEX IF NOT EXISTS idx_messages_conv_created
  ON public.messages(conversation_id, created_at DESC);

-- 6. Add NOT NULL constraint to critical business fields if missing
-- (These already have NOT NULL from schema, but documenting for clarity)

-- 7. Ensure subscription message tracking is indexed
CREATE INDEX IF NOT EXISTS idx_subscriptions_active_business
  ON public.subscriptions(business_id, status)
  WHERE status IN ('active', 'trialing');
