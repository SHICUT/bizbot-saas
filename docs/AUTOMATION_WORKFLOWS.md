# Automation Workflows — n8n Integration

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    OUR APP (Vercel)                                   │
│                                                                      │
│  Cron Jobs (every 15 min)                                            │
│  ├── Scan DB for pending events                                      │
│  ├── Build event payloads                                            │
│  └── Send webhooks to n8n ──────────────────────┐                    │
│                                                  │                    │
│  Callback Endpoint ◄─────────────────────────────┼──── n8n reports   │
│  └── /api/webhooks/n8n                           │     results back  │
└──────────────────────────────────────────────────┼───────────────────┘
                                                   │
                                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    n8n (Self-hosted or Cloud)                         │
│                                                                      │
│  Webhook Receivers:                                                   │
│  ├── /new_lead           → New Lead Follow-Up workflow               │
│  ├── /appointment_reminder → Appointment Reminder workflow           │
│  ├── /missed_customer    → Missed Customer Reactivation workflow     │
│  ├── /payment_reminder   → Payment Reminder workflow                 │
│  └── /trial_expiring     → Trial Conversion workflow                 │
│                                                                      │
│  Each workflow:                                                       │
│  1. Receives event data                                              │
│  2. Applies logic (conditions, formatting)                           │
│  3. Sends WhatsApp message / Email                                   │
│  4. Reports result back to our callback                              │
└─────────────────────────────────────────────────────────────────────┘
```

## Workflow Summary

| # | Workflow | Trigger | Action | Frequency |
|---|---------|---------|--------|-----------|
| 1 | New Lead Follow-Up | New lead created | WhatsApp welcome message (5 min delay) | Real-time |
| 2 | Appointment Reminder | Appointment approaching | WhatsApp reminder (24h + 1h before) | Every 15 min |
| 3 | Missed Customer Reactivation | Lead inactive 7+ days | WhatsApp re-engagement message | Daily |
| 4 | Payment Reminder | Subscription expiring in 3 days | Email + urgent WhatsApp (1 day) | Daily |
| 5 | Trial Conversion | Trial ending in 2-3 days | Email (different for high/low usage) | Daily |

## File Structure

```
src/lib/automations/
├── types.ts              ← Event type definitions (contract with n8n)
├── event-emitter.ts      ← Sends webhooks to n8n (with retry)
└── scheduler.ts          ← Scans DB, builds events, triggers workflows

src/app/api/
├── cron/automations/route.ts  ← Master cron (every 15 min)
├── cron/follow-ups/route.ts   ← AI follow-up cron (every hour)
└── webhooks/n8n/route.ts      ← Callback from n8n

n8n-workflows/
├── 01-new-lead-follow-up.json
├── 02-appointment-reminder.json
├── 03-missed-customer-reactivation.json
├── 04-payment-reminder.json
└── 05-trial-conversion.json
```

## Detailed Workflow Descriptions

### 1. New Lead Follow-Up

**Purpose:** Welcome new leads with a personalized message 5 minutes after their first contact.

```
Trigger: Webhook from our app (when new lead is created)
    │
    ▼
Check: Does lead have a name?
    ├── Yes → "Hi {name}! 👋 Thanks for reaching out..."
    └── No  → "Hi there! 👋 Thanks for reaching out..."
    │
    ▼
Wait: 5 minutes (don't seem like a bot)
    │
    ▼
Send: WhatsApp message via Graph API
    │
    ▼
Callback: Report success/failure to our app
```

**Why 5 min delay?** Immediate auto-replies feel robotic. A short delay makes it feel like a real person noticed and responded.

---

### 2. Appointment Reminder

**Purpose:** Reduce no-shows by reminding customers before their appointment.

```
Trigger: Cron scans appointments due in 24h or 1h
    │
    ▼
Check: Is this a 24h or 1h reminder?
    ├── 24h → "Your appointment is tomorrow at {time}..."
    └── 1h  → "Reminder: your appointment is in 1 hour!"
    │
    ▼
Send: WhatsApp message
    │
    ▼
Mark: appointment.reminder_sent = true
```

**Impact:** Appointment reminders typically reduce no-shows by 30-50%.

---

### 3. Missed Customer Reactivation

**Purpose:** Re-engage leads who showed interest but went quiet.

```
Trigger: Daily scan for leads inactive 7-30 days
    │
    ▼
Filter: Only leads with 2+ messages (had real conversation)
    │
    ▼
Check: Do we know what they were interested in?
    ├── Yes → "We noticed you were interested in {service}..."
    └── No  → "We miss you! Is there anything we can help with?"
    │
    ▼
Send: WhatsApp message
    │
    ▼
Mark: lead.last_reactivation_at = now (prevent spam)
```

**Safeguards:**
- Max 1 reactivation per 14 days per lead
- Only leads with 2+ messages (real conversations, not spam)
- Only 7-30 day window (not too early, not too late)
- Respects AI enabled/disabled setting

---

### 4. Payment Reminder

**Purpose:** Prevent involuntary churn by reminding owners to renew.

```
Trigger: Daily scan for subscriptions expiring in ≤3 days
    │
    ▼
Send: Email with renewal CTA
    │
    ▼
Check: Is it expiring tomorrow AND owner has phone?
    ├── Yes → Send urgent WhatsApp to owner
    └── No  → Done (email is enough)
```

**Escalation:** Email at 3 days, WhatsApp at 1 day (urgent).

---

### 5. Trial Conversion

**Purpose:** Convert trial users to paid based on their usage pattern.

```
Trigger: Daily scan for trials ending in 2-3 days
    │
    ▼
Check: Has the user sent 50+ messages? (high engagement)
    ├── High usage → "You're crushing it! {X} messages handled..."
    │                 (emphasize value, show ROI)
    └── Low usage  → "Tips to get the most out of FlowNex..."
                     (help them succeed, offer setup assistance)
```

**Strategy:** High-usage users need a nudge to pay. Low-usage users need help getting started — they might not have set up properly.

---

## Retry & Error Handling

### Event Emitter (our app → n8n)
```
Attempt 1: immediate
Attempt 2: wait 2 seconds
Attempt 3: wait 5 seconds
Attempt 4: wait 15 seconds (final)

Retries on: network errors, 5xx responses
Does NOT retry on: 4xx (our payload is wrong)
```

### n8n Workflows (built-in)
```
Each HTTP Request node has:
- retryOnFail: true
- maxTries: 3
- waitBetweenTries: 5000-10000ms
```

### Deduplication
```
- Appointment reminders: reminder_sent flag prevents double-send
- Reactivation: last_reactivation_at prevents spam (14-day cooldown)
- Payment reminders: only triggers for subscriptions in specific window
- Trial conversion: only triggers for trials in 2-3 day window
```

---

## Analytics & Logging

Every automation execution is logged to `audit_log`:
```json
{
  "action": "automation_executed",
  "resource_type": "automation",
  "details": {
    "workflow_id": "appointment-reminder",
    "execution_id": "n8n-exec-123",
    "event_type": "appointment_reminder",
    "status": "success"
  }
}
```

Dashboard can query:
- Total automations executed per day/week
- Success/failure rate per workflow
- Messages sent per automation type
- Revenue impact (leads converted after reactivation)

---

## Environment Variables

```env
# n8n webhook base URL (where your n8n instance receives webhooks)
N8N_WEBHOOK_URL=https://your-n8n.example.com/webhook

# Shared secret for webhook authentication (both directions)
N8N_WEBHOOK_SECRET=your-shared-secret-here

# Cron job authorization
CRON_SECRET=your-cron-secret-here
```

---

## n8n Deployment Guide

### Option A: n8n Cloud (Recommended for MVP)
```
1. Sign up at https://n8n.io/cloud
2. Get your webhook base URL (e.g., https://your-instance.app.n8n.cloud/webhook)
3. Import workflow JSON files (Settings → Import from File)
4. Set environment variables in n8n:
   - N8N_WEBHOOK_SECRET (same as your app)
   - FlowNex_PHONE_NUMBER_ID (for payment reminders sent from FlowNex's number)
   - FlowNex_ACCESS_TOKEN (FlowNex's own WhatsApp token)
5. Activate all workflows
6. Set N8N_WEBHOOK_URL in your Vercel env vars
```

### Option B: Self-hosted n8n (Cost-effective at scale)
```bash
# Docker Compose
version: '3.8'
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=your-password
      - WEBHOOK_URL=https://n8n.yourdomain.com
      - N8N_WEBHOOK_SECRET=your-shared-secret
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped

volumes:
  n8n_data:
```

### Option C: Railway/Render (Easy self-host)
```
1. Deploy n8n to Railway: https://railway.app/template/n8n
2. Set custom domain for stable webhook URLs
3. Import workflows
4. Configure env vars
```

---

## Testing

### Test Event Emission
```bash
# Manually trigger the automation cron
curl http://localhost:3000/api/cron/automations \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Expected response:
{
  "success": true,
  "timestamp": "2026-05-29T...",
  "results": {
    "appointment_reminders": { "sent": 2, "skipped": 0 },
    "missed_customers": { "sent": 5, "skipped": 12 },
    "payment_reminders": { "sent": 1, "skipped": 0 },
    "trial_conversions": { "sent": 3, "skipped": 0 }
  }
}
```

### Test n8n Webhook Reception
```bash
# Simulate a new_lead event to n8n
curl -X POST https://your-n8n.example.com/webhook/new_lead \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{
    "type": "new_lead",
    "timestamp": "2026-05-29T10:00:00Z",
    "business_id": "test-123",
    "lead": {
      "id": "lead-456",
      "name": "Priya",
      "phone": "+919876543210",
      "wa_id": "919876543210",
      "first_message": "Hi, what are your prices?",
      "source": "whatsapp"
    },
    "business": {
      "name": "FitZone Gym",
      "phone_number_id": "YOUR_PHONE_ID",
      "access_token": "YOUR_TOKEN"
    }
  }'
```

### Test n8n Callback
```bash
# Simulate n8n reporting back
curl -X POST http://localhost:3000/api/webhooks/n8n \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: your-secret" \
  -d '{
    "workflow_id": "new-lead-follow-up",
    "execution_id": "exec-789",
    "event_type": "new_lead",
    "status": "success",
    "result": { "message_sent": true }
  }'
```

---

## Scaling Considerations

| Stage | Approach |
|-------|----------|
| MVP (0-100 businesses) | n8n Cloud, cron every 15 min |
| Growth (100-500) | Self-hosted n8n, cron every 5 min |
| Scale (500+) | Multiple n8n workers, event-driven (not polling) |
| Enterprise | Replace cron with Supabase Realtime triggers + queue |
