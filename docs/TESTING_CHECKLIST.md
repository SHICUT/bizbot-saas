# WhatsApp E2E Testing Checklist

## Quick Start

```bash
# 1. Start the dev server
npm run dev

# 2. Run the automated test suite (in another terminal)
npm run test:e2e

# 3. Run the full E2E via API (requires database connection)
curl -X POST http://localhost:3000/api/test/whatsapp-e2e \
  -H "Content-Type: application/json" \
  -d '{"message_text": "What are your prices?", "skip_ai": true}'
```

---

## Test Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    TEST LAYERS                                        │
│                                                                      │
│  Layer 1: Build Tests (npm run test:build)                           │
│  ├── TypeScript compilation (tsc --noEmit)                           │
│  ├── ESLint (code quality)                                           │
│  └── Next.js build (route compilation)                               │
│                                                                      │
│  Layer 2: API Tests (npm run test:e2e)                               │
│  ├── Health check                                                    │
│  ├── Webhook verification (GET)                                      │
│  ├── Webhook payload acceptance (POST)                               │
│  ├── Webhook rejection (bad payload)                                 │
│  ├── Auth protection                                                 │
│  └── Cron endpoint auth                                              │
│                                                                      │
│  Layer 3: Full E2E (POST /api/test/whatsapp-e2e)                     │
│  ├── Business routing                                                │
│  ├── Lead upsert                                                     │
│  ├── Conversation creation                                           │
│  ├── Message storage                                                 │
│  ├── AI response generation                                          │
│  ├── Conversation persistence                                        │
│  ├── Message deduplication                                           │
│  └── Subscription limit check                                        │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Automated Test Suite

### Scripts Available

| Command | What It Tests | Requires |
|---------|--------------|----------|
| `npm run typecheck` | TypeScript types | Nothing |
| `npm run lint` | Code quality | Nothing |
| `npm run build` | Full compilation | Nothing |
| `npm run test:build` | All three above | Nothing |
| `npm run test:e2e` | API endpoints live | Dev server running |

### E2E Test Endpoint

**`POST /api/test/whatsapp-e2e`**

Runs 10 automated tests against the live database:

| # | Test | What It Verifies |
|---|------|-----------------|
| 1 | Webhook Verification | Verify token matching + challenge return |
| 2 | Payload Validation | WhatsApp payload structure validation |
| 3 | Business Routing | Finding business by phone_number_id |
| 4 | Lead Upsert | Creating/updating lead from incoming message |
| 5 | Conversation Creation | Creating conversation thread |
| 6 | Message Storage | Storing inbound message with correct fields |
| 7 | AI Response Generation | OpenAI call + outbound message creation |
| 8 | Conversation Persistence | Message count, last_message_at updates |
| 9 | Message Deduplication | Same wa_message_id doesn't create duplicates |
| 10 | Subscription Limit | Checking message quota before sending |

**Options:**
```json
{
  "business_id": "uuid",        // Test against specific business
  "phone_number_id": "string",  // WhatsApp phone number ID
  "sender_phone": "919876543210",
  "sender_name": "Test Customer",
  "message_text": "Hi, what are your prices?",
  "skip_ai": true               // Skip OpenAI call (faster, free)
}
```

---

## Manual Testing Checklist

### 1. Webhook Delivery

| # | Test | Expected | Command |
|---|------|----------|---------|
| 1.1 | Verify webhook (valid token) | 200 + challenge text | `curl "localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=abc123"` |
| 1.2 | Verify webhook (invalid token) | 403 | `curl "localhost:3000/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=WRONG&hub.challenge=abc"` |
| 1.3 | Receive message (valid) | 200 `{"status":"received"}` | See payload below |
| 1.4 | Receive message (invalid JSON) | 400 | `curl -X POST localhost:3000/api/webhooks/whatsapp -d "not json"` |
| 1.5 | Receive message (wrong structure) | 400 | `curl -X POST localhost:3000/api/webhooks/whatsapp -H "Content-Type: application/json" -d '{"object":"wrong"}'` |
| 1.6 | Status update delivery | 200 | See status payload below |

**Valid message payload:**
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
          "metadata": {"display_phone_number": "15551234567", "phone_number_id": "YOUR_PHONE_ID"},
          "contacts": [{"profile": {"name": "Priya"}, "wa_id": "919876543210"}],
          "messages": [{"from": "919876543210", "id": "wamid.test123", "timestamp": "1716000000", "type": "text", "text": {"body": "What are your prices?"}}]
        },
        "field": "messages"
      }]
    }]
  }'
```

**Status update payload:**
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
          "metadata": {"display_phone_number": "15551234567", "phone_number_id": "YOUR_PHONE_ID"},
          "statuses": [{"id": "wamid.test123", "status": "delivered", "timestamp": "1716000001", "recipient_id": "919876543210"}]
        },
        "field": "messages"
      }]
    }]
  }'
```

---

### 2. Message Storage

| # | Test | Verify In Database |
|---|------|-------------------|
| 2.1 | Inbound message stored | `messages` table: direction=inbound, content matches |
| 2.2 | Outbound message stored | `messages` table: direction=outbound, is_ai_generated=true |
| 2.3 | Message type preserved | message_type = text/image/audio/etc |
| 2.4 | wa_message_id stored | Unique constraint prevents duplicates |
| 2.5 | Timestamps correct | created_at is recent |
| 2.6 | Status tracking | status updates from sent→delivered→read |

**Verify in Supabase:**
```sql
SELECT id, direction, content, message_type, is_ai_generated, status, created_at
FROM messages
WHERE business_id = 'YOUR_BIZ_ID'
ORDER BY created_at DESC
LIMIT 10;
```

---

### 3. AI Response Generation

| # | Test | Expected |
|---|------|----------|
| 3.1 | Pricing inquiry | AI responds with business pricing info |
| 3.2 | Timing inquiry | AI responds with business hours |
| 3.3 | Booking request | AI asks for preferred date/time |
| 3.4 | Greeting (first message) | AI greets warmly, asks how to help |
| 3.5 | Acknowledgment (ok/thanks) | AI does NOT reply (skip logic) |
| 3.6 | Escalation request | AI hands off + pauses itself |
| 3.7 | Unknown question | AI says it'll check and get back |
| 3.8 | AI disabled | No reply generated |
| 3.9 | AI paused (owner replied) | No reply generated |
| 3.10 | Message limit reached | No reply generated |

**Test messages to send:**
```
"Hi"                          → Greeting response
"What are your prices?"       → Pricing info from business_context
"What time do you open?"      → Business hours
"I want to book tomorrow"     → Asks for time preference
"ok"                          → No reply (skip)
"thanks"                      → No reply (skip)
"👍"                          → No reply (skip)
"Let me talk to the manager"  → Escalation message
```

---

### 4. Conversation Persistence

| # | Test | Verify |
|---|------|--------|
| 4.1 | Lead created on first message | `leads` table has new row |
| 4.2 | Lead name from WhatsApp profile | `leads.name` = profile name |
| 4.3 | Conversation created | `conversations` table has row |
| 4.4 | last_message_at updated | Conversation shows latest timestamp |
| 4.5 | last_message_text updated | Shows preview of last message |
| 4.6 | unread_count incremented | +1 for each inbound message |
| 4.7 | message_count on lead | Matches actual message count |
| 4.8 | Multiple messages same lead | Same lead_id, same conversation_id |
| 4.9 | AI pause after manual reply | lead.ai_paused_until set |
| 4.10 | Conversation history in AI | Last 12 messages included in prompt |

**Verify conversation state:**
```sql
-- Check lead
SELECT id, name, phone, status, message_count, last_message_at, ai_paused_until
FROM leads WHERE business_id = 'YOUR_BIZ_ID' ORDER BY created_at DESC LIMIT 5;

-- Check conversation
SELECT c.id, c.last_message_text, c.last_message_at, c.unread_count, c.is_ai_active, l.name
FROM conversations c
JOIN leads l ON l.id = c.lead_id
WHERE c.business_id = 'YOUR_BIZ_ID'
ORDER BY c.last_message_at DESC LIMIT 5;

-- Check message history
SELECT direction, content, is_ai_generated, status, created_at
FROM messages
WHERE conversation_id = 'CONV_ID'
ORDER BY created_at ASC;
```

---

### 5. Edge Cases & Error Handling

| # | Test | Expected Behavior |
|---|------|------------------|
| 5.1 | Duplicate webhook (same message_id) | Upsert — no duplicate row |
| 5.2 | Unknown message type (sticker) | Stored as "[Sticker]" or skipped |
| 5.3 | Image with caption | Caption stored as content |
| 5.4 | Location message | Stored as "[Location: name]" |
| 5.5 | Business not found (wrong phone_id) | Logged, no crash, 200 returned |
| 5.6 | Subscription expired | Message not processed, no AI reply |
| 5.7 | OpenAI API down | Fallback message or no reply (no crash) |
| 5.8 | Very long message (4000+ chars) | Stored correctly, AI handles it |
| 5.9 | Empty message body | Skipped (null content) |
| 5.10 | Rapid messages (10 in 1 second) | All processed, rate limiter holds |

---

## Running Tests

### Full Build Verification
```bash
npm run test:build
# Runs: typecheck → lint → build
# Expected: 0 errors
```

### Live API Tests (requires dev server)
```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests
npm run test:e2e
```

### Full E2E with Database
```bash
# Requires: Supabase connected, migrations applied
curl -X POST http://localhost:3000/api/test/whatsapp-e2e \
  -H "Content-Type: application/json" \
  -d '{"skip_ai": false, "message_text": "What are your gym membership plans?"}'
```

### Production Smoke Test
```bash
# After deployment, verify critical paths
curl https://app.FlowNex.ai/api/health
curl "https://app.FlowNex.ai/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=smoke_test"
```

---

## CI Integration

Add to `.github/workflows/ci.yml`:
```yaml
  test:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"
      - run: npm ci
      - run: npm run test:build
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Webhook returns 500 | WHATSAPP_VERIFY_TOKEN not set | Add to .env.local |
| Messages not stored | Business not found for phone_number_id | Connect WhatsApp in settings |
| AI not replying | OPENAI_API_KEY missing or invalid | Check env var |
| AI not replying | ai_enabled = false on business | Enable in automations page |
| AI not replying | ai_paused_until in future | Wait or clear in DB |
| AI not replying | Subscription limit reached | Upgrade plan or reset usage |
| Duplicate messages | Webhook retrying (slow response) | Ensure 200 returned in <5s |
| Lead not created | RLS blocking insert | Use admin client for webhooks |
| Conversation not updating | Trigger not firing | Check on_message_created trigger |
