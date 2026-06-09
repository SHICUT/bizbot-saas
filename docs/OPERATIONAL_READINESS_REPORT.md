# BizBot Operational Readiness Report

**Date:** June 9, 2026  
**Purpose:** Pre-launch review of admin operations, billing recovery, and support workflows

---

## 1. Super Admin Account

| Item | Status | Details |
|------|--------|---------|
| Super admin exists | ✅ YES | `shivam95ku@gmail.com` hardcoded in `src/lib/auth/admin-check.ts` |
| Auth method | Email-based | `isSuperAdmin(email)` checks against `SUPER_ADMIN_EMAILS` array |
| Admin panel | ✅ YES | `/admin` page with 3 tabs: Overview, System Health, Audit Logs |
| Admin sidebar link | ✅ YES | Conditionally shown when `role === "super_admin"` |
| Admin coupon page | ✅ YES | `/admin/coupons` — full CRUD for coupons |

### ⚠️ Recommendation
Add ability to configure super admin emails via environment variable instead of hardcoding. Currently requires code change to add new admins.

---

## 2. Can Admins Manually Upgrade/Downgrade Subscriptions?

### ✅ YES — Fully Implemented

**API:** `POST /api/admin/actions` with `action: "upgrade_plan"`

**Available actions in admin panel (per-business):**
- `→ Starter` — Upgrades to Starter (1K AI replies, 30 days)
- `→ Growth` — Upgrades to Growth (5K AI replies, 30 days)
- `→ Business` — Upgrades to Business (20K AI replies, 30 days)
- `Cancel Subscription` — Sets status to cancelled, reverts plan to trial

**What happens:**
- Sets `plan`, `status: "active"`, `message_limit` to new tier
- Sets `current_period_start/end` to now + 30 days
- Updates `businesses.plan`
- Audit log created

**Gap:** No downgrade-specific action (e.g. Business → Starter). The `upgrade_plan` action works bidirectionally (it sets whatever plan you specify), so it effectively serves as both upgrade and downgrade.

---

## 3. Can Admins Manually Grant Coupons?

### ✅ YES — Fully Implemented

**Page:** `/admin/coupons`  
**API:** `POST /api/admin/coupons`

Admins can:
- ✅ Create any coupon (percentage or fixed)
- ✅ Set applicable plans restriction
- ✅ Set usage limits and expiry
- ✅ Enable/disable coupons
- ✅ Delete coupons
- ✅ View usage count

**Gap:** No ability to send a coupon directly to a specific user. Admin creates the coupon and shares the code manually.

---

## 4. Can Admins Manually Reset AI Reply Usage?

### ✅ YES — Implemented

**Admin panel button:** "Reset Msgs"  
**API:** `POST /api/admin/actions` with `action: "reset_messages"`

**What happens:**
```sql
UPDATE subscriptions SET messages_used = 0 WHERE id = {sub_id}
```

Audit log is created.

---

## 5. Can Admins Manually Activate a Subscription if Razorpay Webhook Fails?

### ✅ YES — Via upgrade_plan action

**Admin panel buttons:** `→ Starter`, `→ Growth`, `→ Business`

These set:
- `status: "active"`
- `message_limit` to appropriate tier
- `current_period_start/end` 

This effectively activates a subscription regardless of Razorpay status. If a webhook fails, admin can manually activate the correct plan.

**Additional option:** `+7 Days` and `+30 Days` buttons extend the subscription period.

---

## 6. Is There a Billing Audit Log?

### ✅ YES — Implemented

**Table:** `audit_logs` (UUID, admin_id, business_id, action, metadata JSONB, created_at)  
**UI:** Admin panel → "Audit Logs" tab  
**API:** `GET /api/admin/audit-logs` (paginated, 20 per page)

**What's logged:**
- Every admin action (upgrade, extend, cancel, reset) via `/api/admin/actions`
- Includes full metadata (which plan, how many days, etc.)
- Timestamped

**Gap:** Subscription changes triggered by Razorpay webhooks (renewal, failure, cancellation) are NOT logged to `audit_logs`. They are logged to `payments` table and Razorpay's own dashboard.

---

## 7. Is There a Way to Recover Failed Webhook Events?

### ❌ NO — Missing

**Current state:**
- Razorpay retries webhooks if response is non-200 (our endpoint always returns 200)
- If processing throws an error, it's logged to console but the event is lost
- No queue, no retry table, no dead-letter mechanism

**What exists:**
- Razorpay dashboard shows webhook delivery history (external, not in our code)
- Admin can manually activate subscriptions as a workaround

### 🔴 MISSING: Needs webhook event store

---

## 8. Is There a Refund Workflow?

### ❌ NO — Missing

**Current state:**
- No refund API endpoint
- No refund button in admin panel
- No Razorpay refund integration
- `cancel_subscription` action downgrades but doesn't refund

**What would be needed:**
- Razorpay Refund API call (`razorpay.payments.refund(payment_id, { amount })`)
- Admin UI with refund reason selector
- Payment status update to "refunded"
- Audit log entry

---

## Summary: Operational Gaps

| # | Feature | Status | Priority | Impact |
|---|---------|--------|----------|--------|
| 1 | Super Admin account | ✅ EXISTS | — | — |
| 2 | Manual upgrade/downgrade | ✅ EXISTS | — | — |
| 3 | Manual coupon grant | ✅ EXISTS | — | — |
| 4 | Manual AI reply reset | ✅ EXISTS | — | — |
| 5 | Manual subscription activation | ✅ EXISTS | — | — |
| 6 | Billing audit log | ✅ EXISTS | — | — |
| 7 | Webhook event recovery | ❌ MISSING | MEDIUM | Missed renewals if webhook processing fails |
| 8 | Refund workflow | ❌ MISSING | MEDIUM | Cannot issue refunds from admin panel |
| 9 | Webhook events in audit log | ⚠️ PARTIAL | LOW | Webhook-triggered changes not in audit log |
| 10 | Multi-admin support via env var | ⚠️ PARTIAL | LOW | Requires code change to add admins |

---

## Launch Decision

### Can you launch without items 7 and 8?

**YES** — with these mitigations:

- **Webhook recovery (item 7):** Razorpay's own dashboard shows delivery attempts. Admin can manually activate subscriptions via the panel. At low volume (< 100 paying customers), manual recovery is acceptable.

- **Refunds (item 8):** Process refunds directly from Razorpay's merchant dashboard (login.razorpay.com → Payments → Refund). No code needed — it's a manual process during early stage.

### Post-Launch Priorities

1. **Week 1-2:** Add webhook event store (save raw events to DB before processing)
2. **Week 2-4:** Add refund API + admin button
3. **Month 2:** Add subscription change notifications (email to user)
4. **Month 2:** Add ENV-based admin list

---

## Verdict

**✅ READY FOR LAUNCH** with the following conditions:
1. The 5 infrastructure configuration steps from the previous audit are completed
2. Refunds are handled manually via Razorpay dashboard
3. Webhook failures are recovered manually via admin panel
4. `014_coupon_system.sql` and `015_audit_logs.sql` migrations are run on production
