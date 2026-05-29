# WhatsApp Cloud API Integration

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    WHATSAPP CLOUD API (Meta)                          │
│                                                                      │
│  Customer sends message → Meta routes to our webhook                 │
│  We send reply → Meta delivers to customer                           │
└───────────────────────┬──────────────────────────────────────────────┘
                        │
                        ▼ POST /api/webhooks/whatsapp
┌──────────────────────────────────────────────────────────────────────┐
│                    WEBHOOK HANDLER                                     │
│                                                                      │
│  1. Validate signature (X-Hub-Signature-256)                         │
│  2. Parse payload                                                    │
│  3. Return 200 immediately (Meta requires <5s response)              │
│  4. Process asynchronously ↓                                         │
└───────────────────────┬──────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    MESSAGE HANDLER                                     │
│                                                                      │
│  5. Route to business (by phone_number_id)                           │
│  6. Check subscription limits                                        │
│  7. Upsert lead (new contact = new lead)                             │
│  8. Upsert conversation                                              │
│  9. Store inbound message (dedup by wa_message_id)                   │
│  10. Check if AI should reply                                        │
│      ├── AI disabled? → stop                                         │
│      ├── AI paused (owner replied)? → stop                           │
│      └── AI active → continue ↓                                      │
└───────────────────────┬──────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    AI REPLY ENGINE                                     │
│                                                                      │
│  11. Build system prompt (business context + tone + language)         │
│  12. Include last 8 messages as conversation history                 │
│  13. Call OpenAI GPT-4o-mini                                         │
│  14. Check if reply is needed (skip "ok", "thanks", etc.)            │
└───────────────────────┬──────────────────────────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    WHATSAPP CLIENT                                     │
│                                                                      │
│  15. Rate limit check (60 msgs/min per business)                     │
│  16. Send reply via WhatsApp API (with retry + backoff)              │
│  17. Store outbound message                                          │
│  18. Mark incoming as read (blue ticks)                              │
│  19. Increment usage counter                                         │
└──────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/lib/whatsapp/
├── types.ts              ← Full WhatsApp API type definitions
├── client.ts             ← WhatsApp API client (send, retry, rate limit)
├── webhook-validator.ts  ← Security (signature, verification, structure)
└── message-handler.ts    ← Core processing pipeline

src/lib/ai/
└── reply-engine.ts       ← OpenAI integration for generating replies

src/lib/queue/
└── message-queue.ts      ← Simple retry queue (upgrade to Redis later)

src/app/api/
├── webhooks/whatsapp/route.ts        ← Webhook endpoint (GET + POST)
├── messages/send/route.ts            ← Manual message sending
└── business/connect-whatsapp/route.ts ← WhatsApp credential setup
```

## Security Layers

### 1. Webhook Signature Validation
```
Meta signs every webhook with HMAC-SHA256 using your App Secret.
We validate this signature before processing any payload.
If invalid → 401 response, payload discarded.
```

### 2. Webhook Verify Token
```
When registering the webhook URL, Meta sends a GET with a verify_token.
We check it matches our stored token.
This prevents anyone from registering our URL as their webhook.
```

### 3. Constant-Time Comparison
```
Signature comparison uses XOR-based constant-time check.
Prevents timing attacks that could leak the expected signature.
```

### 4. Message Deduplication
```
UNIQUE constraint on (business_id, wa_message_id).
Meta may retry webhooks — we won't process the same message twice.
```

### 5. Rate Limiting
```
Token bucket: 60 messages per minute per business.
Prevents runaway loops or abuse from consuming API quota.
```

### 6. Access Token Storage
```
WhatsApp access tokens stored in database.
In production: encrypt with AES-256-GCM before storage.
Service role key required to read (not accessible from browser).
```

## Retry System

### Outbound Messages (WhatsApp Client)
```
Attempt 1: immediate
Attempt 2: wait 1 second
Attempt 3: wait 3 seconds
Attempt 4: wait 10 seconds (final)

Retries on:
- HTTP 429 (rate limited by Meta)
- HTTP 5xx (Meta server error)
- Network errors (timeout, DNS failure)

Does NOT retry on:
- HTTP 400 (bad request — our fault)
- HTTP 401 (invalid token)
- HTTP 404 (invalid phone number)
```

### Webhook Processing (Message Queue)
```
If message processing fails:
Attempt 1: immediate
Attempt 2: wait 1 second
Attempt 3: wait 4 seconds
Attempt 4: wait 9 seconds (final)

After max attempts: log error, move to dead letter (future: alert owner)
```

## Rate Limit Handling

### Our Rate Limiter (per business)
```
Algorithm: Token Bucket
Capacity: 60 tokens
Refill: 60 tokens per minute
Effect: Max 60 outbound messages per minute per business

Why: WhatsApp allows ~80/sec but we're conservative to avoid hitting
Meta's limits and getting the business's number throttled.
```

### Meta's Rate Limits
```
- Messaging limits depend on phone number quality rating
- New numbers: 250 business-initiated conversations/24h
- Verified numbers: 1000-100,000/24h (based on tier)
- Customer-initiated (replies): unlimited within 24h window

We handle Meta's 429 responses with exponential backoff.
```

## Message Status Tracking

```
Message lifecycle:
pending → sent → delivered → read

Status updates come via webhook (same endpoint):
- "sent": message left Meta's servers
- "delivered": message reached customer's phone
- "read": customer opened the message (blue ticks)
- "failed": delivery failed (wrong number, blocked, etc.)

We update the messages table status on each webhook.
Dashboard shows real-time delivery status.
```

## Environment Variables

```env
# Required for webhook verification
WHATSAPP_VERIFY_TOKEN=any-random-string-you-choose

# Required for webhook signature validation (security)
# Get from: Meta Developer Dashboard → App Settings → Basic → App Secret
WHATSAPP_APP_SECRET=your-meta-app-secret

# Required for AI replies
OPENAI_API_KEY=sk-your-key

# Per-business credentials (stored in database, not env):
# - whatsapp_phone_number_id
# - whatsapp_access_token
# - whatsapp_business_account_id
```

## Setup Instructions

### 1. Meta Developer Account Setup

```
1. Go to https://developers.facebook.com
2. Create a new app (type: Business)
3. Add "WhatsApp" product to your app
4. Note your App Secret (Settings → Basic)
```

### 2. WhatsApp Business Setup

```
1. In your Meta app → WhatsApp → Getting Started
2. Note the "Phone number ID" and "WhatsApp Business Account ID"
3. Generate a permanent access token:
   - Go to Business Settings → System Users
   - Create a system user with admin access
   - Generate token with whatsapp_business_messaging permission
```

### 3. Connect in BizBot Dashboard

```
1. Go to Settings → WhatsApp Connection
2. Enter: Phone Number ID, Business Account ID, Access Token
3. Click "Connect"
4. API verifies credentials with Meta
5. Returns webhook URL + verify token
```

### 4. Configure Webhook in Meta Dashboard

```
1. Go to your Meta app → WhatsApp → Configuration
2. Webhook URL: https://your-domain.com/api/webhooks/whatsapp
3. Verify Token: (the one returned in step 3)
4. Click "Verify and Save"
5. Subscribe to webhook fields: "messages"
```

### 5. Test End-to-End

```
1. Send a WhatsApp message to your business number
2. Check Supabase → leads table (new lead created)
3. Check Supabase → messages table (inbound message stored)
4. Check WhatsApp (AI reply should arrive within 2-3 seconds)
5. Check Supabase → messages table (outbound AI message stored)
```

## Testing Instructions

### Test Webhook Verification (GET)
```bash
curl "http://localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"

# Expected: "test123" (plain text, 200 OK)
```

### Test Webhook with Sample Payload (POST)
```bash
curl -X POST http://localhost:3000/api/webhooks/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "WABA_ID",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "919876543210",
            "phone_number_id": "YOUR_PHONE_NUMBER_ID"
          },
          "contacts": [{
            "profile": { "name": "Test Customer" },
            "wa_id": "919876543210"
          }],
          "messages": [{
            "from": "919876543210",
            "id": "wamid.test123",
            "timestamp": "1716000000",
            "type": "text",
            "text": { "body": "Hi, what are your prices?" }
          }]
        },
        "field": "messages"
      }]
    }]
  }'

# Expected: {"status":"received"} (200 OK)
# Check database: new lead + message should appear
```

### Test Manual Message Send
```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{
    "lead_id": "LEAD_UUID",
    "content": "Thanks for reaching out! How can I help?"
  }'

# Expected: {"success": true, "message": {...}}
```

### Test WhatsApp Connection
```bash
curl -X POST http://localhost:3000/api/business/connect-whatsapp \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{
    "phone_number_id": "YOUR_PHONE_NUMBER_ID",
    "business_account_id": "YOUR_WABA_ID",
    "access_token": "YOUR_ACCESS_TOKEN"
  }'

# Expected: {"success": true, "webhook_url": "...", "verify_token": "...", "instructions": [...]}
```

## Production Checklist

- [ ] Set `WHATSAPP_APP_SECRET` in production env
- [ ] Set `WHATSAPP_VERIFY_TOKEN` in production env
- [ ] Set `OPENAI_API_KEY` in production env
- [ ] Deploy to Vercel (HTTPS required for webhooks)
- [ ] Register webhook URL in Meta Dashboard
- [ ] Subscribe to "messages" webhook field
- [ ] Test with real WhatsApp message
- [ ] Monitor error logs for failed deliveries
- [ ] Set up alerts for message limit approaching

## Scaling Path

| Stage | Solution |
|-------|----------|
| MVP (0-100 businesses) | Inline processing in webhook handler |
| Growth (100-500) | Add Redis + BullMQ for async processing |
| Scale (500-2000) | Separate webhook receiver from processor |
| Enterprise (2000+) | Dedicated message broker (SQS/Kafka) |
