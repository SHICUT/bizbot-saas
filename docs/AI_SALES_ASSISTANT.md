# AI Sales Assistant — Architecture & Documentation

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    INCOMING MESSAGE                                   │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 INTENT CLASSIFIER (Local)                             │
│                                                                      │
│  Pattern matching → greeting | pricing | booking | complaint | ...   │
│  Fast (no API call) — handles 70% of messages                       │
│  Falls back to AI classification for ambiguous messages              │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 MEMORY MANAGER                                        │
│                                                                      │
│  Load: business context + lead info + last 12 messages               │
│  Track: collected info (name, email, preferences)                    │
│  Summarize: older messages into compact context                      │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 SYSTEM PROMPT BUILDER                                 │
│                                                                      │
│  Dynamic prompt based on:                                            │
│  - Business info (services, prices, hours)                           │
│  - AI personality (tone, language)                                   │
│  - Customer context (name, history, collected info)                  │
│  - Current time (business hours awareness)                           │
│  - Conversation goals (qualify, book, nurture)                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 OPENAI GPT-4o-mini                                    │
│                                                                      │
│  Model: gpt-4o-mini (cost-efficient, fast)                           │
│  Max tokens: 250 (WhatsApp-appropriate length)                       │
│  Temperature: 0.7 (natural but consistent)                           │
│  Function calling: enabled (5 tools)                                 │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 ACTION EXECUTOR                                       │
│                                                                      │
│  Processes AI function calls:                                        │
│  - book_appointment → creates appointment in DB                      │
│  - collect_customer_info → updates lead metadata                     │
│  - escalate_to_human → pauses AI, notifies owner                    │
│  - schedule_follow_up → queues automated follow-up                  │
│  - qualify_lead → updates lead score + status                       │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 REPLY → WhatsApp                                      │
└─────────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/lib/ai/
├── types.ts                    ← All type definitions
├── sales-assistant.ts          ← Main orchestrator (entry point)
├── reply-engine.ts             ← Backward-compatible interface
├── action-executor.ts          ← Executes AI decisions (DB writes)
├── memory.ts                   ← Conversation memory management
├── follow-up.ts                ← Automated follow-up engine
├── prompts/
│   ├── system-prompt.ts        ← Dynamic system prompt builder
│   └── intent-classifier.ts    ← Local + AI intent classification
└── tools/
    └── function-definitions.ts ← OpenAI function calling schemas
```

## Conversation Flow

### New Customer (First Message)
```
Customer: "Hi"
    │
    ├── Intent: greeting
    ├── Action: none
    └── AI Reply: "Hi there! 👋 Welcome to [Business]! How can I help you today?"

Customer: "What are your prices?"
    │
    ├── Intent: pricing_inquiry
    ├── Action: qualify_lead(score: 40, status: "contacted")
    └── AI Reply: "Great question! Here are our plans: [prices from context]
                   Which one interests you most?"

Customer: "The Pro plan looks good. Can I try it?"
    │
    ├── Intent: ready_to_buy
    ├── Actions: [collect_info(preferred_service: "Pro"), qualify_lead(score: 70)]
    └── AI Reply: "Awesome choice! 🎉 We offer a free trial class.
                   When would you like to come in?"

Customer: "Tomorrow at 6 PM"
    │
    ├── Intent: booking_request
    ├── Actions: [book_appointment(title: "Free Trial", date: tomorrow, time: 18:00)]
    └── AI Reply: "Done! ✨ I've booked your free trial for tomorrow at 6 PM.
                   We'll send you a reminder. See you then!"
```

### Angry Customer (Escalation)
```
Customer: "This is terrible service! I want to speak to the manager!"
    │
    ├── Intent: needs_human (detected locally)
    ├── Actions: [escalate(reason: "Customer angry, requesting manager", urgency: "high")]
    └── AI Reply: "I'm really sorry about your experience. Let me connect you
                   with our manager who can help resolve this right away. 🙏"
    │
    └── System: AI paused for this conversation, owner notified
```

### Lead Goes Quiet (Follow-Up)
```
Day 0: Customer asks about pricing, AI replies
Day 1: No response → System sends gentle follow-up
Day 3: Still no response → System sends offer/value message
Day 7: Final check-in → No more follow-ups after this
```

## AI Function Calling (Tools)

The AI can call 5 functions during a conversation:

| Function | When Used | Effect |
|----------|-----------|--------|
| `book_appointment` | Customer confirms date/time | Creates appointment in DB |
| `collect_customer_info` | Customer shares name/email/preferences | Updates lead record |
| `escalate_to_human` | Customer angry or requests human | Pauses AI, alerts owner |
| `schedule_follow_up` | Customer interested but uncommitted | Queues auto follow-up |
| `qualify_lead` | Buying signals detected | Updates lead score (0-100) |

## Prompt Engineering

### Key Principles Applied:

1. **Role clarity** — "You are [Business]'s sales assistant, NOT a chatbot"
2. **Explicit constraints** — "Keep messages SHORT (2-4 sentences)"
3. **Goal hierarchy** — Answer → Build rapport → Qualify → Book
4. **Safety rails** — Never reveal AI, never give medical/legal advice
5. **Tone control** — Friendly/Casual/Formal with specific examples
6. **Language support** — English/Hindi/Hinglish with natural switching
7. **Escalation rules** — Clear criteria for when to hand off

### Dynamic Context Injection:
- Business hours (knows when they're open/closed)
- Current time (adjusts greetings accordingly)
- Collected info (doesn't re-ask what it already knows)
- Conversation history (references previous messages)
- Lead status (adjusts approach based on qualification)

## Lead Qualification Scoring

| Score | Status | Meaning | AI Behavior |
|-------|--------|---------|-------------|
| 0-20 | new | Just browsing | Be helpful, don't push |
| 30-50 | contacted | Showing interest | Nurture, share value |
| 60-70 | qualified | Ready to consider | Suggest trial/visit |
| 80-100 | converted | Ready to buy | Close the deal |

### Scoring Signals:
- +20: Asked about specific pricing
- +20: Asked about availability/timing
- +30: Requested booking/trial
- +10: Shared personal info (name, email)
- -20: Price objection without resolution
- -30: Said "not interested" / "maybe later"

## Memory & Context Handling

### Short-term (per conversation):
- Last 12 messages included verbatim in API call
- Provides immediate conversational context
- AI can reference what was said recently

### Long-term (per lead):
- Collected info stored in lead metadata
- Preferences, budget, service interest persisted
- Available across conversations (if customer returns)

### Summarization (for long conversations):
- When history exceeds 20 messages
- Older messages summarized into compact context
- Saves tokens while preserving key information

## Fallback Handling

| Scenario | Fallback |
|----------|----------|
| OpenAI API down | Pre-written response based on detected intent |
| API key missing | Generic "I'll get back to you shortly" |
| Rate limited | Queue message, retry with backoff |
| Confidence < 0.3 | Escalate to human |
| Unknown intent | Ask clarifying question |
| Message too short (ok/thanks) | Skip reply entirely |

## Cost Analysis

```
Model: gpt-4o-mini
Input: ~500 tokens (system prompt + history + message)
Output: ~100 tokens (reply)
Cost per turn: ~$0.0001 (₹0.008)

Average conversation: 5 turns
Cost per conversation: ~$0.0005 (₹0.04)

1000 conversations/month: ~$0.50 (₹42)
```

## Testing

### Test Intent Classification:
```typescript
import { classifyIntentLocal } from "@/lib/ai/prompts/intent-classifier";

// Should return "pricing_inquiry"
classifyIntentLocal("What are your prices?");

// Should return "booking_request"
classifyIntentLocal("I want to book an appointment");

// Should return "needs_human"
classifyIntentLocal("Let me talk to a real person");

// Should return null (needs AI classification)
classifyIntentLocal("I was thinking about maybe coming sometime");
```

### Test Full Sales Reply:
```typescript
import { generateSalesReply } from "@/lib/ai/sales-assistant";

const ctx = {
  businessId: "test",
  leadId: "test",
  conversationId: "test",
  businessName: "FitZone Gym",
  businessContext: "Gym in Pune. Plans: Basic ₹1500, Pro ₹2500, Premium ₹4000.",
  businessType: "gym",
  businessHours: { mon: { open: "06:00", close: "22:00", closed: false } },
  tone: "friendly",
  language: "english",
  leadName: "Priya",
  leadPhone: "919876543210",
  leadStatus: "new",
  leadMetadata: {},
  conversationHistory: [],
  currentIntent: null,
  collectedInfo: {},
};

const response = await generateSalesReply(ctx, "What are your membership plans?");
// response.reply → pricing info
// response.intent → "pricing_inquiry"
// response.actions → [qualify_lead(score: 40)]
```

### Test Follow-Up Engine:
```bash
# Trigger follow-up processing manually
curl http://localhost:3000/api/cron/follow-ups \
  -H "Authorization: Bearer YOUR_CRON_SECRET"

# Expected: {"success": true, "sent": 3, "skipped": 12}
```
