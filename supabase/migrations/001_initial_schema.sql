-- ============================================================================
-- FLOWNEX AI - COMPLETE DATABASE SCHEMA
-- Multi-tenant WhatsApp Automation SaaS
-- ============================================================================
-- Architecture: Multi-tenant with Row Level Security (RLS)
-- Every table is scoped to a business_id
-- Users own businesses, businesses own everything else
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. BUSINESSES (Tenant table - the core of multi-tenancy)
-- ============================================================================
-- Every paying customer is a "business". All data is scoped to a business.
-- One user can own one business (MVP). Multi-business support is Phase 2.

CREATE TABLE public.businesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Business Info
    name TEXT NOT NULL,
    slug TEXT UNIQUE,                              -- URL-friendly identifier
    type TEXT DEFAULT 'other',                     -- gym | salon | clinic | coaching | restaurant | other
    phone TEXT,                                    -- owner's personal phone
    email TEXT,
    address TEXT,
    city TEXT,
    state TEXT,

    -- WhatsApp Cloud API Credentials (encrypted at app level)
    whatsapp_phone_number_id TEXT,                 -- Meta phone number ID
    whatsapp_business_account_id TEXT,             -- WABA ID
    whatsapp_access_token TEXT,                    -- encrypted before storage
    whatsapp_webhook_verify_token TEXT,            -- for webhook verification
    whatsapp_connected BOOLEAN DEFAULT false,
    whatsapp_connected_at TIMESTAMPTZ,

    -- AI Configuration
    business_context TEXT,                         -- what AI knows about this business
    ai_enabled BOOLEAN DEFAULT true,
    ai_tone TEXT DEFAULT 'friendly',              -- friendly | casual | formal
    ai_language TEXT DEFAULT 'english',           -- english | hindi | hinglish
    ai_pause_duration INTEGER DEFAULT 30,         -- minutes to pause AI after manual reply

    -- Business Hours (JSONB for flexibility)
    business_hours JSONB DEFAULT '{
        "mon": {"open": "09:00", "close": "21:00", "closed": false},
        "tue": {"open": "09:00", "close": "21:00", "closed": false},
        "wed": {"open": "09:00", "close": "21:00", "closed": false},
        "thu": {"open": "09:00", "close": "21:00", "closed": false},
        "fri": {"open": "09:00", "close": "21:00", "closed": false},
        "sat": {"open": "09:00", "close": "21:00", "closed": false},
        "sun": {"open": "09:00", "close": "13:00", "closed": false}
    }'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT true,
    onboarding_completed BOOLEAN DEFAULT false,
    plan TEXT DEFAULT 'trial',                    -- trial | starter | pro | business

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE UNIQUE INDEX idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX idx_businesses_whatsapp_phone ON public.businesses(whatsapp_phone_number_id) WHERE whatsapp_phone_number_id IS NOT NULL;
CREATE INDEX idx_businesses_plan ON public.businesses(plan) WHERE is_active = true;
CREATE INDEX idx_businesses_type ON public.businesses(type);

-- ============================================================================
-- 2. LEADS (Every person who messages the business)
-- ============================================================================
-- Auto-created when a new WhatsApp contact messages.
-- This is the CRM core — tracks lifecycle from first message to conversion.

CREATE TABLE public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

    -- Contact Info
    wa_id TEXT NOT NULL,                           -- WhatsApp ID (usually phone number)
    phone TEXT NOT NULL,                           -- normalized phone number
    name TEXT,                                     -- profile name from WhatsApp
    email TEXT,                                    -- collected via conversation

    -- Lead Status & Scoring
    status TEXT DEFAULT 'new' NOT NULL,            -- new | contacted | qualified | converted | lost
    score INTEGER DEFAULT 0,                      -- 0-100 lead quality score
    source TEXT DEFAULT 'whatsapp',               -- whatsapp | manual | import
    tags TEXT[] DEFAULT '{}',                     -- flexible tagging

    -- Conversation Metadata
    first_message_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    message_count INTEGER DEFAULT 0,
    ai_paused_until TIMESTAMPTZ,                  -- when owner manually replies

    -- Custom Data (flexible for different business types)
    metadata JSONB DEFAULT '{}'::jsonb,           -- e.g. {"interested_in": "pro plan", "budget": "2500"}

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Constraints
    CONSTRAINT unique_lead_per_business UNIQUE(business_id, wa_id)
);

-- Indexes
CREATE INDEX idx_leads_business_status ON public.leads(business_id, status);
CREATE INDEX idx_leads_business_created ON public.leads(business_id, created_at DESC);
CREATE INDEX idx_leads_business_last_msg ON public.leads(business_id, last_message_at DESC);
CREATE INDEX idx_leads_wa_id ON public.leads(business_id, wa_id);
CREATE INDEX idx_leads_phone ON public.leads(business_id, phone);
CREATE INDEX idx_leads_tags ON public.leads USING GIN(tags);

-- ============================================================================
-- 3. CONVERSATIONS (Thread grouping for messages)
-- ============================================================================
-- One conversation per lead. Tracks conversation-level metadata.
-- Separating from leads allows future multi-channel support.

CREATE TABLE public.conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,

    -- Conversation State
    channel TEXT DEFAULT 'whatsapp' NOT NULL,      -- whatsapp | instagram | facebook (future)
    status TEXT DEFAULT 'active' NOT NULL,         -- active | archived | blocked
    is_ai_active BOOLEAN DEFAULT true,            -- is AI currently handling this conversation
    unread_count INTEGER DEFAULT 0,

    -- Last Message Preview (denormalized for fast list rendering)
    last_message_text TEXT,
    last_message_at TIMESTAMPTZ,
    last_message_direction TEXT,                   -- inbound | outbound

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- One conversation per lead per channel
    CONSTRAINT unique_conversation UNIQUE(business_id, lead_id, channel)
);

-- Indexes
CREATE INDEX idx_conversations_business_updated ON public.conversations(business_id, last_message_at DESC);
CREATE INDEX idx_conversations_business_status ON public.conversations(business_id, status) WHERE status = 'active';
CREATE INDEX idx_conversations_lead ON public.conversations(lead_id);

-- ============================================================================
-- 4. MESSAGES (Individual messages in conversations)
-- ============================================================================
-- High-volume table. Optimized for chronological reads per conversation.
-- Partitioning by date can be added later when volume demands it.

CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,

    -- Message Content
    wa_message_id TEXT,                            -- WhatsApp's message ID (for dedup)
    direction TEXT NOT NULL,                       -- inbound | outbound
    content TEXT NOT NULL,                         -- message text
    message_type TEXT DEFAULT 'text' NOT NULL,     -- text | image | audio | video | document | location
    media_url TEXT,                                -- URL for non-text messages

    -- AI Metadata
    is_ai_generated BOOLEAN DEFAULT false,
    ai_model TEXT,                                 -- gpt-4o-mini | gpt-4o
    ai_tokens_used INTEGER DEFAULT 0,
    ai_confidence REAL,                           -- 0.0 to 1.0

    -- Delivery Status
    status TEXT DEFAULT 'sent' NOT NULL,           -- pending | sent | delivered | read | failed
    error_message TEXT,                            -- if status = failed

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,

    -- Prevent duplicate processing
    CONSTRAINT unique_wa_message UNIQUE(business_id, wa_message_id)
);

-- Indexes (optimized for conversation view + analytics)
CREATE INDEX idx_messages_conversation_time ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_business_time ON public.messages(business_id, created_at DESC);
CREATE INDEX idx_messages_lead ON public.messages(lead_id, created_at DESC);
CREATE INDEX idx_messages_wa_id ON public.messages(wa_message_id) WHERE wa_message_id IS NOT NULL;
CREATE INDEX idx_messages_ai ON public.messages(business_id, is_ai_generated, created_at DESC) WHERE is_ai_generated = true;

-- ============================================================================
-- 5. APPOINTMENTS (Bookings from conversations)
-- ============================================================================
-- Created when AI or owner books an appointment during conversation.

CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,

    -- Appointment Details
    title TEXT NOT NULL,                           -- "Free Trial Class", "Haircut", etc.
    service TEXT,                                  -- service category
    notes TEXT,

    -- Scheduling
    scheduled_at TIMESTAMPTZ NOT NULL,            -- appointment date/time
    duration_minutes INTEGER DEFAULT 60,
    end_at TIMESTAMPTZ,                           -- computed: scheduled_at + duration

    -- Status
    status TEXT DEFAULT 'pending' NOT NULL,        -- pending | confirmed | completed | cancelled | no_show
    reminder_sent BOOLEAN DEFAULT false,
    reminder_sent_at TIMESTAMPTZ,

    -- Source
    booked_by TEXT DEFAULT 'ai',                  -- ai | owner | customer
    booked_via TEXT DEFAULT 'whatsapp',           -- whatsapp | dashboard | manual

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_appointments_business_date ON public.appointments(business_id, scheduled_at DESC);
CREATE INDEX idx_appointments_business_status ON public.appointments(business_id, status, scheduled_at);
CREATE INDEX idx_appointments_lead ON public.appointments(lead_id);
CREATE INDEX idx_appointments_upcoming ON public.appointments(business_id, scheduled_at)
    WHERE status IN ('pending', 'confirmed');

-- ============================================================================
-- 6. SUBSCRIPTIONS (Billing & plan management)
-- ============================================================================
-- Tracks Razorpay subscription lifecycle.
-- One active subscription per business at a time.

CREATE TABLE public.subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

    -- Plan Info
    plan TEXT NOT NULL,                            -- trial | starter | pro | business
    status TEXT DEFAULT 'active' NOT NULL,         -- active | past_due | cancelled | expired | trialing

    -- Razorpay
    razorpay_subscription_id TEXT,
    razorpay_customer_id TEXT,
    razorpay_plan_id TEXT,

    -- Billing Period
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,

    -- Usage Limits
    message_limit INTEGER NOT NULL DEFAULT 100,   -- monthly message cap
    messages_used INTEGER DEFAULT 0,              -- reset each billing cycle
    last_usage_reset_at TIMESTAMPTZ DEFAULT now(),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_subscriptions_business ON public.subscriptions(business_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(business_id, status) WHERE status = 'active';
CREATE INDEX idx_subscriptions_razorpay ON public.subscriptions(razorpay_subscription_id) WHERE razorpay_subscription_id IS NOT NULL;

-- ============================================================================
-- 7. PAYMENTS (Payment history / invoices)
-- ============================================================================
-- Every successful/failed payment attempt is logged here.

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,

    -- Payment Details
    amount INTEGER NOT NULL,                      -- amount in paise (₹999 = 99900)
    currency TEXT DEFAULT 'INR' NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,        -- pending | captured | failed | refunded

    -- Razorpay
    razorpay_payment_id TEXT,
    razorpay_order_id TEXT,
    razorpay_signature TEXT,
    razorpay_invoice_id TEXT,

    -- Metadata
    payment_method TEXT,                           -- card | upi | netbanking | wallet
    description TEXT,
    failure_reason TEXT,
    receipt_url TEXT,

    -- Timestamps
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_payments_business ON public.payments(business_id, created_at DESC);
CREATE INDEX idx_payments_subscription ON public.payments(subscription_id);
CREATE INDEX idx_payments_razorpay ON public.payments(razorpay_payment_id) WHERE razorpay_payment_id IS NOT NULL;
CREATE INDEX idx_payments_status ON public.payments(business_id, status);

-- ============================================================================
-- 8. AUTOMATION_RULES (Configurable automation behaviors)
-- ============================================================================
-- Defines what the AI should do in specific scenarios.
-- Examples: "When someone asks about pricing, send price list"
--           "After 24h of no reply, send follow-up"

CREATE TABLE public.automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,

    -- Rule Definition
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL,                            -- auto_reply | follow_up | reminder | welcome | away
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,                   -- higher = runs first

    -- Trigger Conditions (JSONB for flexibility)
    trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Examples:
    -- auto_reply: {"keywords": ["price", "cost", "plan"], "match_type": "any"}
    -- follow_up: {"delay_hours": 24, "max_attempts": 3}
    -- reminder: {"before_minutes": 60, "appointment_status": "confirmed"}
    -- welcome: {"on_first_message": true}
    -- away: {"outside_business_hours": true}

    -- Action (what to do when triggered)
    action_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Examples:
    -- {"type": "send_message", "template": "Here are our plans: ..."}
    -- {"type": "ai_reply", "context": "Focus on converting this lead"}
    -- {"type": "notify_owner", "channel": "whatsapp"}
    -- {"type": "update_lead", "set_status": "contacted"}

    -- Stats
    times_triggered INTEGER DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_automation_rules_business ON public.automation_rules(business_id, is_active, priority DESC);
CREATE INDEX idx_automation_rules_type ON public.automation_rules(business_id, type) WHERE is_active = true;

-- ============================================================================
-- 9. AUDIT_LOG (Track important actions for security & debugging)
-- ============================================================================
-- Lightweight audit trail. Not for every message, but for important events.

CREATE TABLE public.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    business_id UUID REFERENCES public.businesses(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Event
    action TEXT NOT NULL,                          -- login | settings_changed | whatsapp_connected | subscription_changed | etc.
    resource_type TEXT,                            -- business | lead | subscription | automation_rule
    resource_id UUID,
    details JSONB DEFAULT '{}'::jsonb,            -- action-specific data

    -- Context
    ip_address INET,
    user_agent TEXT,

    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_audit_log_business ON public.audit_log(business_id, created_at DESC);
CREATE INDEX idx_audit_log_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_action ON public.audit_log(action, created_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
-- Core principle: Users can only access data belonging to their business.
-- Service role (backend) bypasses RLS for webhook processing.

-- Enable RLS on all tables
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper function: get the business_id for the current user
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT id FROM public.businesses WHERE owner_id = auth.uid() LIMIT 1;
$$;

-- ─── BUSINESSES ─────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own business"
    ON public.businesses FOR SELECT
    USING (owner_id = auth.uid());

CREATE POLICY "Users can insert own business"
    ON public.businesses FOR INSERT
    WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update own business"
    ON public.businesses FOR UPDATE
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- No delete policy: businesses are soft-deleted (is_active = false)

-- ─── LEADS ──────────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own leads"
    ON public.leads FOR SELECT
    USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert leads"
    ON public.leads FOR INSERT
    WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can update own leads"
    ON public.leads FOR UPDATE
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can delete own leads"
    ON public.leads FOR DELETE
    USING (business_id = public.get_user_business_id());

-- ─── CONVERSATIONS ──────────────────────────────────────────────────────────

CREATE POLICY "Users can view own conversations"
    ON public.conversations FOR SELECT
    USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert conversations"
    ON public.conversations FOR INSERT
    WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can update own conversations"
    ON public.conversations FOR UPDATE
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());

-- ─── MESSAGES ───────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own messages"
    ON public.messages FOR SELECT
    USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert messages"
    ON public.messages FOR INSERT
    WITH CHECK (business_id = public.get_user_business_id());

-- Messages are immutable: no update/delete policies

-- ─── APPOINTMENTS ───────────────────────────────────────────────────────────

CREATE POLICY "Users can view own appointments"
    ON public.appointments FOR SELECT
    USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert appointments"
    ON public.appointments FOR INSERT
    WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can update own appointments"
    ON public.appointments FOR UPDATE
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can delete own appointments"
    ON public.appointments FOR DELETE
    USING (business_id = public.get_user_business_id());

-- ─── SUBSCRIPTIONS ──────────────────────────────────────────────────────────

CREATE POLICY "Users can view own subscription"
    ON public.subscriptions FOR SELECT
    USING (business_id = public.get_user_business_id());

-- Insert/Update only via service role (backend handles billing)

-- ─── PAYMENTS ───────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own payments"
    ON public.payments FOR SELECT
    USING (business_id = public.get_user_business_id());

-- Insert only via service role (webhook handler)

-- ─── AUTOMATION RULES ───────────────────────────────────────────────────────

CREATE POLICY "Users can view own automation rules"
    ON public.automation_rules FOR SELECT
    USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert automation rules"
    ON public.automation_rules FOR INSERT
    WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can update own automation rules"
    ON public.automation_rules FOR UPDATE
    USING (business_id = public.get_user_business_id())
    WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can delete own automation rules"
    ON public.automation_rules FOR DELETE
    USING (business_id = public.get_user_business_id());

-- ─── AUDIT LOG ──────────────────────────────────────────────────────────────

CREATE POLICY "Users can view own audit log"
    ON public.audit_log FOR SELECT
    USING (business_id = public.get_user_business_id());

-- Insert only via service role

-- ============================================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leads
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.subscriptions
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.automation_rules
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- TRIGGER: Auto-create business on user signup
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.businesses (owner_id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business'),
        NEW.email
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- TRIGGER: Auto-create trial subscription for new business
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_business()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.subscriptions (
        business_id,
        plan,
        status,
        message_limit,
        trial_start,
        trial_end,
        current_period_start,
        current_period_end
    ) VALUES (
        NEW.id,
        'trial',
        'trialing',
        100,
        now(),
        now() + INTERVAL '14 days',
        now(),
        now() + INTERVAL '14 days'
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_business_created
    AFTER INSERT ON public.businesses
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_business();

-- ============================================================================
-- TRIGGER: Update conversation last_message when new message inserted
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update conversation preview
    UPDATE public.conversations
    SET
        last_message_text = NEW.content,
        last_message_at = NEW.created_at,
        last_message_direction = NEW.direction,
        unread_count = CASE
            WHEN NEW.direction = 'inbound' THEN unread_count + 1
            ELSE unread_count
        END,
        updated_at = now()
    WHERE id = NEW.conversation_id;

    -- Update lead last_message_at and message_count
    UPDATE public.leads
    SET
        last_message_at = NEW.created_at,
        message_count = message_count + 1,
        updated_at = now()
    WHERE id = NEW.lead_id;

    RETURN NEW;
END;
$$;

CREATE TRIGGER on_message_created
    AFTER INSERT ON public.messages
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_message();

-- ============================================================================
-- FUNCTION: Increment message usage for subscription
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_message_usage(p_business_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_limit INTEGER;
    v_used INTEGER;
BEGIN
    SELECT message_limit, messages_used
    INTO v_limit, v_used
    FROM public.subscriptions
    WHERE business_id = p_business_id AND status IN ('active', 'trialing')
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_used >= v_limit THEN
        RETURN false;  -- limit reached
    END IF;

    UPDATE public.subscriptions
    SET messages_used = messages_used + 1, updated_at = now()
    WHERE business_id = p_business_id AND status IN ('active', 'trialing');

    RETURN true;
END;
$$;

-- ============================================================================
-- FUNCTION: Reset monthly message usage (called by cron)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.subscriptions
    SET
        messages_used = 0,
        last_usage_reset_at = now(),
        updated_at = now()
    WHERE status IN ('active', 'trialing')
      AND current_period_end <= now();
END;
$$;

-- ============================================================================
-- SEED: Default automation rules template (applied on business creation)
-- ============================================================================
-- These are created via application code during onboarding, not via trigger,
-- to keep the schema clean. Documented here for reference:
--
-- 1. Welcome Message (type: welcome)
--    trigger: {"on_first_message": true}
--    action: {"type": "ai_reply", "context": "Greet warmly, introduce business"}
--
-- 2. Away Message (type: away)
--    trigger: {"outside_business_hours": true}
--    action: {"type": "send_message", "template": "We're currently closed..."}
--
-- 3. Follow-up (type: follow_up)
--    trigger: {"delay_hours": 24, "if_no_reply": true}
--    action: {"type": "ai_reply", "context": "Gentle follow-up"}

-- ============================================================================
-- DONE
-- ============================================================================
