-- ============================================================================
-- INSTAGRAM DM SUPPORT
-- Extends the multi-channel architecture for Instagram messaging
-- ============================================================================

-- Add Instagram columns to businesses table
ALTER TABLE public.businesses
  ADD COLUMN IF NOT EXISTS instagram_account_id TEXT,
  ADD COLUMN IF NOT EXISTS instagram_page_id TEXT,         -- Facebook Page ID linked to IG
  ADD COLUMN IF NOT EXISTS instagram_access_token TEXT,    -- Page access token (long-lived)
  ADD COLUMN IF NOT EXISTS instagram_username TEXT,
  ADD COLUMN IF NOT EXISTS instagram_connected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS instagram_connected_at TIMESTAMPTZ;

-- Index for webhook routing (find business by Instagram account ID)
CREATE INDEX IF NOT EXISTS idx_businesses_instagram
  ON public.businesses(instagram_account_id)
  WHERE instagram_account_id IS NOT NULL;

-- The existing tables already support multi-channel:
-- leads.source can be 'instagram'
-- conversations.channel can be 'instagram'
-- messages work for any channel
-- No new tables needed — the architecture is already channel-agnostic.

-- Add channel_metadata to conversations for channel-specific data
ALTER TABLE public.conversations
  ADD COLUMN IF NOT EXISTS channel_metadata JSONB DEFAULT '{}'::jsonb;
  -- For Instagram: {"ig_thread_id": "...", "ig_sender_id": "..."}

-- Add source_channel to messages for unified inbox filtering
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS source_channel TEXT DEFAULT 'whatsapp';

-- Index for unified inbox (filter by channel)
CREATE INDEX IF NOT EXISTS idx_conversations_channel
  ON public.conversations(business_id, channel, last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_channel
  ON public.messages(business_id, source_channel, created_at DESC);
