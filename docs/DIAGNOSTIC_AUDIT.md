# FlowNex Chatbot — Diagnostic Audit Report

**Date:** June 10, 2026  
**Issues Reported:** Storage problem, delayed chat responses  
**Database:** Supabase (PostgreSQL with RLS)  
**Hosting:** Vercel (Serverless Functions)  
**AI Provider:** Groq (primary) → Gemini (fallback) → OpenAI (fallback)

---

## STORAGE AUDIT

### Database Connection: ✅ HEALTHY

- Supabase URL configured: `dwezqiruggjpdnmfhxbj.supabase.co`
- Anon key: Set (sb_publishable_*)
- Service role key: Set (sb_secret_*)
- Server client: Uses `@supabase/ssr` with cookie-based auth
- Admin client: Uses `@supabase/supabase-js` with service role (bypasses RLS)

### Data Persistence: ✅ WORKING (with caveats)

| Data Type | Storage Location | Method | Status |
|-----------|-----------------|--------|--------|
| User messages (inbound) | `messages` table | Upsert by `wa_message_id` (dedup) | ✅ |
| AI replies (outbound) | `messages` table | Insert | ✅ |
| Leads | `leads` table | Upsert by `business_id,wa_id` | ✅ |
| Conversations | `conversations` table | Upsert by `business_id,lead_id,channel` | ✅ |
| Contact details | `leads.phone`, `leads.name` | From WhatsApp profile | ✅ |
| Chat history | `messages` table | Chronological per conversation | ✅ |
| Knowledge base | `business_services`, `business_plans`, `business_faqs` + `business_context` | Via `/api/knowledge` | ✅ |
| Appointments | `appointments` table | Via AI action or manual | ✅ |

### ⚠️ IDENTIFIED STORAGE ISSUE #1: Silent Write Failures

**Location:** `src/lib/whatsapp/message-handler.ts`

Multiple database operations have NO error handling — they fire and forget:

```typescript
// Line ~177: Update lead last_message_at — no error check
await supabase.from("leads").update({ last_message_at: ... }).eq("id", lead.id);

// Line ~171: Update conversation metadata — no error check  
await supabase.from("conversations").update({ last_message_text: ... }).eq("id", conversation.id);
```

If these fail (network blip, timeout), the data is silently lost. The message is stored, but metadata (last_message_at, unread_count) may not update.

**Severity:** MEDIUM  
**Impact:** Dashboard shows stale "last message" timestamps, unread counts may be wrong.

### ⚠️ IDENTIFIED STORAGE ISSUE #2: RLS Blocking Service Role on Some Tables

**Root Cause Theory:** If the `coupon_redemptions` table (from migration 014) doesn't have a policy allowing service role access, and `SUPABASE_SERVICE_ROLE_KEY` format has changed with newer Supabase versions, writes could fail silently.

Supabase service role keys that start with `sb_secret_` are the new format. These bypass RLS by default. However, if there's a misconfiguration, it could cause silent failures.

**Severity:** LOW (likely not the issue since messages DO save)

---

## PERFORMANCE AUDIT

### Response Time Breakdown (Estimated)

The webhook handler executes **23 sequential `await` calls**. Here's the latency breakdown:

| Step | Operation | Estimated Time |
|------|-----------|---------------|
| 1 | Business lookup by phone_number_id | 50-100ms |
| 2 | Subscription check + Lead upsert (PARALLEL) | 100-200ms |
| 3 | Lead status update (if new) | 50-100ms |
| 4 | Conversation upsert | 50-100ms |
| 5 | Message store (upsert with dedup) | 50-100ms |
| 6 | Conversation metadata update | 50ms |
| 7 | Lead last_message_at update | 50ms |
| 8 | **AI Generation (Groq/Gemini)** | **800-3000ms** ⚡ |
| 9 | WhatsApp API send (with retry) | 200-500ms |
| 10 | Store outbound message | 50-100ms |
| 11 | Increment usage counter | 50ms |
| 12 | Update conversation last_message | 50ms |
| 13 | Mark as read | 100-200ms |
| **TOTAL** | | **1.7s - 4.8s** |

### 🔴 PRIMARY BOTTLENECK: AI Model Response Time

| Provider | Average Latency | Notes |
|----------|----------------|-------|
| Groq (llama-3.3-70b) | 800-2000ms | Fast inference, sometimes rate-limited |
| Gemini 2.0 Flash | 1000-3000ms | Reliable but slower |
| OpenAI gpt-4o-mini | 1500-4000ms | Slowest, last resort |

When Groq is healthy: **Total response = 2-3 seconds** (acceptable for WhatsApp)  
When Groq fails and falls to Gemini: **Total response = 3-5 seconds** (noticeable delay)  
When both fail: **Total response = 5-8 seconds** (poor UX)

### 🟡 SECONDARY BOTTLENECK: Sequential Database Writes

13 sequential DB operations (excluding the parallel step 2) add ~650ms-1300ms. Several could be parallelized or made non-blocking.

### Vercel Function Configuration

- No `maxDuration` configured in `next.config.ts`
- Default Vercel Hobby: 10s timeout
- Default Vercel Pro: 60s timeout
- The webhook handler processes synchronously (correct — fire-and-forget would die on serverless)

---

## IDENTIFIED ISSUES & FIXES

### Issue 1: Sequential Post-Send Operations Causing Unnecessary Delay

**Steps 10-13** (after WhatsApp send) are all sequential but NONE depend on each other.

**Fix:** Parallelize post-send operations.

### Issue 2: Conversation History Query Fetches Too Much

`getConversationHistory` fetches last 10 messages but doesn't filter by time — for long conversations this could return very old context irrelevant to current query.

**Fix:** Add time-based filter (last 24h OR last 10, whichever is smaller).

### Issue 3: No Timeout on AI API Calls

The `callGemini`, `callGroq`, `callOpenAI` functions use `fetch()` without an `AbortController` timeout. If the AI provider hangs, the entire webhook hangs until Vercel kills it.

**Fix:** Add 8-second timeout to all AI calls.

---

## FIXES IMPLEMENTED
