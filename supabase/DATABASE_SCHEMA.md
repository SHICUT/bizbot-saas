# Database Schema Documentation

## Architecture Overview

```
auth.users (Supabase managed)
    │
    ▼ 1:1
businesses (tenant)
    │
    ├── 1:N → leads
    │           │
    │           ├── 1:1 → conversations
    │           │              │
    │           │              └── 1:N → messages
    │           │
    │           └── 1:N → appointments
    │
    ├── 1:N → subscriptions
    │
    ├── 1:N → payments
    │
    ├── 1:N → automation_rules
    │
    └── 1:N → audit_log
```

**Multi-tenancy model:** Every table has a `business_id` column. Row Level Security ensures users can only access their own business data. The service role (backend API) bypasses RLS for webhook processing.

---

## Table Details

### 1. businesses

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| owner_id | UUID | NO | - | FK → auth.users |
| name | TEXT | NO | - | Business display name |
| slug | TEXT | YES | - | URL-friendly unique identifier |
| type | TEXT | YES | 'other' | gym/salon/clinic/coaching/restaurant/other |
| phone | TEXT | YES | - | Owner's personal phone |
| email | TEXT | YES | - | Business email |
| address | TEXT | YES | - | Physical address |
| city | TEXT | YES | - | City |
| state | TEXT | YES | - | State |
| whatsapp_phone_number_id | TEXT | YES | - | Meta API phone number ID |
| whatsapp_business_account_id | TEXT | YES | - | WABA ID |
| whatsapp_access_token | TEXT | YES | - | Encrypted access token |
| whatsapp_webhook_verify_token | TEXT | YES | - | Webhook verification |
| whatsapp_connected | BOOLEAN | YES | false | Connection status |
| whatsapp_connected_at | TIMESTAMPTZ | YES | - | When connected |
| business_context | TEXT | YES | - | AI knowledge base |
| ai_enabled | BOOLEAN | YES | true | Master AI toggle |
| ai_tone | TEXT | YES | 'friendly' | AI personality |
| ai_language | TEXT | YES | 'english' | Reply language |
| ai_pause_duration | INTEGER | YES | 30 | Minutes to pause after manual reply |
| business_hours | JSONB | YES | {...} | Operating hours |
| is_active | BOOLEAN | YES | true | Soft delete flag |
| onboarding_completed | BOOLEAN | YES | false | Setup wizard status |
| plan | TEXT | YES | 'trial' | Current plan |
| created_at | TIMESTAMPTZ | NO | now() | - |
| updated_at | TIMESTAMPTZ | NO | now() | - |

**Indexes:**
- `idx_businesses_owner` — UNIQUE on owner_id (one business per user)
- `idx_businesses_whatsapp_phone` — lookup by WhatsApp phone (webhook routing)
- `idx_businesses_plan` — filter by plan
- `idx_businesses_type` — filter by business type

**Security:** Owner can SELECT, INSERT, UPDATE. No DELETE (soft delete via is_active).

---

### 2. leads

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| business_id | UUID | NO | - | FK → businesses |
| wa_id | TEXT | NO | - | WhatsApp ID |
| phone | TEXT | NO | - | Normalized phone |
| name | TEXT | YES | - | WhatsApp profile name |
| email | TEXT | YES | - | Collected via chat |
| status | TEXT | NO | 'new' | new/contacted/qualified/converted/lost |
| score | INTEGER | YES | 0 | Lead quality 0-100 |
| source | TEXT | YES | 'whatsapp' | Lead source |
| tags | TEXT[] | YES | {} | Flexible tags |
| first_message_at | TIMESTAMPTZ | YES | - | First contact time |
| last_message_at | TIMESTAMPTZ | YES | - | Most recent message |
| message_count | INTEGER | YES | 0 | Total messages |
| ai_paused_until | TIMESTAMPTZ | YES | - | AI pause expiry |
| metadata | JSONB | YES | {} | Custom fields |
| created_at | TIMESTAMPTZ | NO | now() | - |
| updated_at | TIMESTAMPTZ | NO | now() | - |

**Indexes:**
- `idx_leads_business_status` — filter leads by status
- `idx_leads_business_created` — sort by newest
- `idx_leads_business_last_msg` — sort by recent activity
- `idx_leads_wa_id` — lookup by WhatsApp ID (webhook)
- `idx_leads_phone` — search by phone
- `idx_leads_tags` — GIN index for tag filtering

**Constraint:** UNIQUE(business_id, wa_id) — one lead per WhatsApp contact per business.

---

### 3. conversations

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| business_id | UUID | NO | - | FK → businesses |
| lead_id | UUID | NO | - | FK → leads |
| channel | TEXT | NO | 'whatsapp' | Communication channel |
| status | TEXT | NO | 'active' | active/archived/blocked |
| is_ai_active | BOOLEAN | YES | true | AI handling this chat |
| unread_count | INTEGER | YES | 0 | Unread messages |
| last_message_text | TEXT | YES | - | Preview text |
| last_message_at | TIMESTAMPTZ | YES | - | For sorting |
| last_message_direction | TEXT | YES | - | inbound/outbound |
| created_at | TIMESTAMPTZ | NO | now() | - |
| updated_at | TIMESTAMPTZ | NO | now() | - |

**Design decision:** Denormalized `last_message_*` fields avoid a JOIN when rendering the conversation list (the most common query).

---

### 4. messages

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| business_id | UUID | NO | - | FK → businesses |
| conversation_id | UUID | NO | - | FK → conversations |
| lead_id | UUID | NO | - | FK → leads |
| wa_message_id | TEXT | YES | - | WhatsApp dedup ID |
| direction | TEXT | NO | - | inbound/outbound |
| content | TEXT | NO | - | Message text |
| message_type | TEXT | NO | 'text' | text/image/audio/video/document/location |
| media_url | TEXT | YES | - | Media file URL |
| is_ai_generated | BOOLEAN | YES | false | AI wrote this |
| ai_model | TEXT | YES | - | Which model |
| ai_tokens_used | INTEGER | YES | 0 | Token consumption |
| ai_confidence | REAL | YES | - | AI confidence score |
| status | TEXT | NO | 'sent' | pending/sent/delivered/read/failed |
| error_message | TEXT | YES | - | Failure reason |
| created_at | TIMESTAMPTZ | NO | now() | - |

**High-volume table.** No UPDATE trigger (messages are immutable). Indexed for conversation-level reads.

**Constraint:** UNIQUE(business_id, wa_message_id) — prevents duplicate webhook processing.

---

### 5. appointments

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| business_id | UUID | NO | - | FK → businesses |
| lead_id | UUID | NO | - | FK → leads |
| title | TEXT | NO | - | Appointment title |
| service | TEXT | YES | - | Service category |
| notes | TEXT | YES | - | Additional notes |
| scheduled_at | TIMESTAMPTZ | NO | - | When |
| duration_minutes | INTEGER | YES | 60 | How long |
| end_at | TIMESTAMPTZ | YES | - | Computed end time |
| status | TEXT | NO | 'pending' | pending/confirmed/completed/cancelled/no_show |
| reminder_sent | BOOLEAN | YES | false | Reminder status |
| reminder_sent_at | TIMESTAMPTZ | YES | - | When reminder sent |
| booked_by | TEXT | YES | 'ai' | ai/owner/customer |
| booked_via | TEXT | YES | 'whatsapp' | Channel |
| created_at | TIMESTAMPTZ | NO | now() | - |
| updated_at | TIMESTAMPTZ | NO | now() | - |

---

### 6. subscriptions

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| business_id | UUID | NO | - | FK → businesses |
| plan | TEXT | NO | - | trial/starter/pro/business |
| status | TEXT | NO | 'active' | active/past_due/cancelled/expired/trialing |
| razorpay_subscription_id | TEXT | YES | - | Razorpay sub ID |
| razorpay_customer_id | TEXT | YES | - | Razorpay customer |
| razorpay_plan_id | TEXT | YES | - | Razorpay plan |
| current_period_start | TIMESTAMPTZ | YES | - | Billing period start |
| current_period_end | TIMESTAMPTZ | YES | - | Billing period end |
| trial_start | TIMESTAMPTZ | YES | - | Trial start |
| trial_end | TIMESTAMPTZ | YES | - | Trial end |
| cancelled_at | TIMESTAMPTZ | YES | - | Cancellation time |
| message_limit | INTEGER | NO | 100 | Monthly cap |
| messages_used | INTEGER | YES | 0 | Current usage |
| last_usage_reset_at | TIMESTAMPTZ | YES | now() | Last reset |
| created_at | TIMESTAMPTZ | NO | now() | - |
| updated_at | TIMESTAMPTZ | NO | now() | - |

**Security:** Users can only SELECT. INSERT/UPDATE is done by service role (backend handles billing logic).

---

### 7. payments

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| business_id | UUID | NO | - | FK → businesses |
| subscription_id | UUID | YES | - | FK → subscriptions |
| amount | INTEGER | NO | - | Amount in paise |
| currency | TEXT | NO | 'INR' | Currency code |
| status | TEXT | NO | 'pending' | pending/captured/failed/refunded |
| razorpay_payment_id | TEXT | YES | - | Razorpay payment ID |
| razorpay_order_id | TEXT | YES | - | Razorpay order ID |
| razorpay_signature | TEXT | YES | - | Verification signature |
| razorpay_invoice_id | TEXT | YES | - | Invoice ID |
| payment_method | TEXT | YES | - | card/upi/netbanking/wallet |
| description | TEXT | YES | - | Payment description |
| failure_reason | TEXT | YES | - | Why it failed |
| receipt_url | TEXT | YES | - | Invoice URL |
| paid_at | TIMESTAMPTZ | YES | - | Successful payment time |
| created_at | TIMESTAMPTZ | NO | now() | - |

---

### 8. automation_rules

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| business_id | UUID | NO | - | FK → businesses |
| name | TEXT | NO | - | Rule name |
| description | TEXT | YES | - | What it does |
| type | TEXT | NO | - | auto_reply/follow_up/reminder/welcome/away |
| is_active | BOOLEAN | YES | true | Enabled/disabled |
| priority | INTEGER | YES | 0 | Execution order |
| trigger_config | JSONB | NO | {} | When to trigger |
| action_config | JSONB | NO | {} | What to do |
| times_triggered | INTEGER | YES | 0 | Usage counter |
| last_triggered_at | TIMESTAMPTZ | YES | - | Last execution |
| created_at | TIMESTAMPTZ | NO | now() | - |
| updated_at | TIMESTAMPTZ | NO | now() | - |

---

### 9. audit_log

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | UUID | NO | uuid_generate_v4() | Primary key |
| business_id | UUID | YES | - | FK → businesses |
| user_id | UUID | YES | - | FK → auth.users |
| action | TEXT | NO | - | Event type |
| resource_type | TEXT | YES | - | What was affected |
| resource_id | UUID | YES | - | Which record |
| details | JSONB | YES | {} | Event data |
| ip_address | INET | YES | - | Client IP |
| user_agent | TEXT | YES | - | Browser/client |
| created_at | TIMESTAMPTZ | NO | now() | - |

---

## Security Model

### Row Level Security (RLS)

Every table has RLS enabled. Policies use a helper function:

```sql
get_user_business_id() → returns the business_id for auth.uid()
```

| Table | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| businesses | own only | own only | own only | ❌ (soft delete) |
| leads | own biz | own biz | own biz | own biz |
| conversations | own biz | own biz | own biz | ❌ |
| messages | own biz | own biz | ❌ (immutable) | ❌ |
| appointments | own biz | own biz | own biz | own biz |
| subscriptions | own biz | ❌ (service role) | ❌ (service role) | ❌ |
| payments | own biz | ❌ (service role) | ❌ | ❌ |
| automation_rules | own biz | own biz | own biz | own biz |
| audit_log | own biz | ❌ (service role) | ❌ | ❌ |

### Service Role Access

The backend API uses the Supabase service role key for:
- Processing WhatsApp webhooks (inserting messages, leads)
- Handling Razorpay webhooks (inserting payments, updating subscriptions)
- Writing audit logs
- Resetting monthly usage

### Data Encryption

- `whatsapp_access_token` is encrypted at the application level before storage
- Supabase provides encryption at rest for the entire database
- All connections use TLS

---

## Automated Behaviors (Triggers)

| Trigger | Event | Action |
|---------|-------|--------|
| `set_updated_at` | BEFORE UPDATE | Sets `updated_at = now()` |
| `on_auth_user_created` | AFTER INSERT on auth.users | Creates a business record |
| `on_business_created` | AFTER INSERT on businesses | Creates trial subscription |
| `on_message_created` | AFTER INSERT on messages | Updates conversation preview + lead stats |

---

## Key Queries (Performance Optimized)

### 1. Get conversation list (inbox view)
```sql
SELECT c.*, l.name, l.phone
FROM conversations c
JOIN leads l ON l.id = c.lead_id
WHERE c.business_id = $1 AND c.status = 'active'
ORDER BY c.last_message_at DESC
LIMIT 50;
-- Uses: idx_conversations_business_updated
```

### 2. Get messages for a conversation
```sql
SELECT * FROM messages
WHERE conversation_id = $1
ORDER BY created_at ASC
LIMIT 100;
-- Uses: idx_messages_conversation_time
```

### 3. Find lead by WhatsApp ID (webhook)
```sql
SELECT * FROM leads
WHERE business_id = $1 AND wa_id = $2;
-- Uses: idx_leads_wa_id (unique constraint)
```

### 4. Route webhook to business
```sql
SELECT * FROM businesses
WHERE whatsapp_phone_number_id = $1 AND is_active = true;
-- Uses: idx_businesses_whatsapp_phone
```

### 5. Check message limit
```sql
SELECT message_limit, messages_used
FROM subscriptions
WHERE business_id = $1 AND status IN ('active', 'trialing')
ORDER BY created_at DESC LIMIT 1;
-- Uses: idx_subscriptions_status
```

---

## Scaling Considerations

| When | Action |
|------|--------|
| 100K+ messages | Partition `messages` table by month |
| 1000+ businesses | Add connection pooling (PgBouncer) |
| Heavy reads | Add read replicas |
| Global expansion | Multi-region Supabase |
| Real-time inbox | Use Supabase Realtime subscriptions on conversations |

---

## Migration Commands

```bash
# Apply migration to Supabase
supabase db push

# Or run directly
psql $DATABASE_URL -f supabase/migrations/001_initial_schema.sql
```
