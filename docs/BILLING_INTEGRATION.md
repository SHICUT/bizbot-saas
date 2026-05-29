# Billing Integration — Razorpay + Stripe

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Dashboard)                               │
│                                                                      │
│  Billing Page → Select Plan → Click "Upgrade"                        │
│       │                                                              │
│       ▼                                                              │
│  POST /api/payments/razorpay/create-subscription                     │
│       │                                                              │
│       ▼                                                              │
│  Razorpay Checkout Modal opens (UPI/Card/NetBanking)                 │
│       │                                                              │
│       ▼ (on success)                                                 │
│  POST /api/payments/razorpay/verify (signature validation)           │
│       │                                                              │
│       ▼                                                              │
│  Subscription activated → Page reloads                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    RAZORPAY (Recurring Payments)                      │
│                                                                      │
│  Monthly/Yearly auto-debit                                           │
│       │                                                              │
│       ▼ Webhook                                                      │
│  POST /api/webhooks/razorpay                                         │
│       │                                                              │
│       ├── subscription.charged → Renew period, reset usage           │
│       ├── subscription.halted → Mark cancelled, downgrade            │
│       ├── payment.failed → Log failure, notify owner                 │
│       └── subscription.cancelled → Downgrade to trial                │
└─────────────────────────────────────────────────────────────────────┘
```

## Pricing Structure

| Plan | Monthly | Yearly (20% off) | Messages | Target |
|------|---------|-------------------|----------|--------|
| **Starter** | ₹999 | ₹9,590 (₹799/mo) | 1,000/mo | Small businesses |
| **Pro** | ₹2,499 | ₹23,990 (₹1,999/mo) | 5,000/mo | Growing businesses |
| **Business** | ₹4,999 | ₹47,990 (₹3,999/mo) | Unlimited | High-volume |
| **Trial** | Free (14 days) | — | 100 | New signups |

## File Structure

```
src/lib/payments/
├── plans.ts                ← Plan definitions (single source of truth)
├── razorpay.ts             ← Razorpay SDK integration
└── subscription-guard.ts   ← Feature gating + usage checks

src/app/api/payments/
├── razorpay/
│   ├── create-subscription/route.ts  ← Create new subscription
│   ├── verify/route.ts               ← Verify payment signature
│   └── cancel/route.ts               ← Cancel subscription
├── status/route.ts                   ← Get subscription status
└── (webhooks handled in /api/webhooks/razorpay)

supabase/migrations/
└── 002_billing_enhancements.sql      ← Invoices table, plan config
```

## Payment Flow (Step by Step)

### 1. User Clicks "Upgrade"
```
Frontend → POST /api/payments/razorpay/create-subscription
Body: { plan_id: "pro_monthly" }
```

### 2. Backend Creates Subscription
```
- Validates plan exists
- Gets/creates Razorpay plan (cached in DB)
- Creates Razorpay subscription
- Stores in our subscriptions table (status: "created")
- Returns subscription_id + key_id
```

### 3. Frontend Opens Checkout
```javascript
const rzp = new Razorpay({
  key: data.key_id,
  subscription_id: data.subscription_id,
  name: "BizBot AI",
  handler: async (response) => {
    // Verify payment
    await fetch("/api/payments/razorpay/verify", {
      method: "POST",
      body: JSON.stringify(response),
    });
  },
});
rzp.open();
```

### 4. Payment Verification
```
Frontend → POST /api/payments/razorpay/verify
Body: { razorpay_payment_id, razorpay_subscription_id, razorpay_signature }

Backend:
- Validates HMAC signature (payment_id|subscription_id)
- Activates subscription in DB
- Records payment
```

### 5. Recurring Payments (Webhook)
```
Razorpay auto-charges → POST /api/webhooks/razorpay
- Validates webhook signature
- Updates subscription period
- Resets message usage
- Generates invoice
```

## Subscription Guard (Feature Gating)

```typescript
import { canSendMessage, hasFeatureAccess } from "@/lib/payments/subscription-guard";

// In webhook handler (hot path):
const allowed = await canSendMessage(businessId);
if (!allowed) return; // Don't process, don't reply

// In API routes:
const canBook = await hasFeatureAccess(businessId, "appointmentBooking");
if (!canBook) return NextResponse.json({ error: "Upgrade to Pro" }, { status: 403 });
```

### Feature Access by Tier:

| Feature | Trial | Starter | Pro | Business |
|---------|-------|---------|-----|----------|
| AI auto-reply | ✅ | ✅ | ✅ | ✅ |
| Lead capture | ✅ | ✅ | ✅ | ✅ |
| Conversation inbox | ✅ | ✅ | ✅ | ✅ |
| Appointment booking | ❌ | ❌ | ✅ | ✅ |
| Follow-up sequences | ❌ | ❌ | ✅ | ✅ |
| Analytics | ❌ | ❌ | ✅ | ✅ |
| Custom AI training | ❌ | ❌ | ❌ | ✅ |
| Multi-agent | ❌ | ❌ | ❌ | ✅ |
| Campaigns | ❌ | ❌ | ❌ | ✅ |

## Invoice Generation

Invoices are auto-generated on every successful payment:
- Invoice number: `INV-{timestamp_base36}`
- Includes GST (18%)
- Stored in `invoices` table
- Accessible via dashboard

## Webhook Security

```
Razorpay signs webhooks with HMAC-SHA256 using your webhook secret.
We validate before processing any event.

Header: x-razorpay-signature
Validation: HMAC-SHA256(body, RAZORPAY_WEBHOOK_SECRET) === signature
```

## Environment Variables

```env
# Razorpay (Indian payments)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx      # or rzp_test_ for testing
RAZORPAY_KEY_SECRET=your-key-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret  # Set in Razorpay Dashboard

# Stripe (International — Phase 2)
# STRIPE_SECRET_KEY=sk_live_xxxxx
# STRIPE_WEBHOOK_SECRET=whsec_xxxxx
# NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
```

## Razorpay Dashboard Setup

### 1. Create Account
```
1. Sign up at https://razorpay.com
2. Complete KYC verification
3. Get API keys from Settings → API Keys
```

### 2. Configure Webhook
```
1. Go to Settings → Webhooks
2. Add new webhook:
   - URL: https://your-app.vercel.app/api/webhooks/razorpay
   - Secret: (generate a random string, save as RAZORPAY_WEBHOOK_SECRET)
   - Events: subscription.activated, subscription.charged,
             subscription.halted, subscription.cancelled, payment.failed
3. Save
```

### 3. Test Mode
```
Use rzp_test_ keys for development.
Test card: 4111 1111 1111 1111 (any expiry, any CVV)
Test UPI: success@razorpay
```

## Testing Instructions

### 1. Create Subscription (Test Mode)
```bash
curl -X POST http://localhost:3000/api/payments/razorpay/create-subscription \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{"plan_id": "pro_monthly"}'

# Returns: { subscription_id, short_url, key_id }
# Open short_url to complete payment in test mode
```

### 2. Verify Payment
```bash
curl -X POST http://localhost:3000/api/payments/razorpay/verify \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{
    "razorpay_payment_id": "pay_test_xxx",
    "razorpay_subscription_id": "sub_test_xxx",
    "razorpay_signature": "computed_signature"
  }'
```

### 3. Check Status
```bash
curl http://localhost:3000/api/payments/status \
  -H "Cookie: YOUR_AUTH_COOKIE"

# Returns: { isActive, plan, messagesUsed, messageLimit, features, ... }
```

### 4. Cancel Subscription
```bash
curl -X POST http://localhost:3000/api/payments/razorpay/cancel \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE" \
  -d '{"immediate": false}'
```

### 5. Simulate Webhook
```bash
# Use Razorpay's webhook testing tool in dashboard
# Or manually:
curl -X POST http://localhost:3000/api/webhooks/razorpay \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: COMPUTED_SIGNATURE" \
  -d '{"event": "subscription.charged", "payload": {...}}'
```

## Production Deployment Checklist

- [ ] Switch from `rzp_test_` to `rzp_live_` keys
- [ ] Set `RAZORPAY_WEBHOOK_SECRET` in Vercel env
- [ ] Register webhook URL in Razorpay Dashboard (production)
- [ ] Subscribe to all subscription + payment events
- [ ] Test with ₹1 subscription (create a ₹1 test plan)
- [ ] Verify invoices are generated correctly
- [ ] Test cancellation flow
- [ ] Test failed payment flow (webhook)
- [ ] Monitor webhook delivery in Razorpay Dashboard

## Stripe Integration (Phase 2 — International)

When ready to accept international payments:

```
1. npm install stripe @stripe/stripe-js
2. Create src/lib/payments/stripe.ts (mirror razorpay.ts structure)
3. Add /api/payments/stripe/* routes
4. Add /api/webhooks/stripe route
5. Frontend: detect currency/country → route to Razorpay or Stripe
```

The subscription-guard.ts already supports both providers — just add the Stripe-specific logic.
