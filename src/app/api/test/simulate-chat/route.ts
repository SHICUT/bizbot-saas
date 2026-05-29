import { NextRequest, NextResponse } from "next/server";
import { generateSalesReply } from "@/lib/ai/sales-assistant";
import { detectLanguageAndTone } from "@/lib/ai/prompts/language-detector";
import type { ConversationContext, ChatMessage } from "@/lib/ai/types";

/**
 * POST /api/test/simulate-chat
 *
 * Chat simulator endpoint — tests the AI without WhatsApp.
 * Returns the AI reply + debug information (language detection, timing, etc.)
 *
 * Body: {
 *   message: string,
 *   history?: Array<{ role: "user" | "assistant", content: string }>,
 *   businessContext?: string,
 *   contactName?: string
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const body = await request.json();
  const {
    message,
    history = [],
    businessContext,
    contactName = "Test Customer",
  } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // 1. Detect language
  const languageResult = detectLanguageAndTone(message);

  // 2. Build context
  const ctx: ConversationContext = {
    businessId: "simulator",
    leadId: "simulator",
    conversationId: "simulator",
    businessName: "FitZone Gym",
    businessContext: businessContext || `We are FitZone Gym located in Koregaon Park, Pune.

Membership Plans:
- Basic: ₹1,500/month (gym access only)
- Pro: ₹2,500/month (gym + group classes)
- Premium: ₹4,000/month (gym + classes + personal trainer)

Timings: Mon-Sat 6 AM to 10 PM, Sunday 7 AM to 1 PM
Facilities: AC gym, locker rooms, shower, parking, juice bar
Classes: Zumba (6 PM), HIIT (7 PM), Yoga (8 PM)
Free trial class available for new members.
Contact: +91 98765 43210
Address: 2nd Floor, Phoenix Mall, Koregaon Park, Pune 411001`,
    businessType: "gym",
    businessHours: {
      mon: { open: "06:00", close: "22:00", closed: false },
      tue: { open: "06:00", close: "22:00", closed: false },
      wed: { open: "06:00", close: "22:00", closed: false },
      thu: { open: "06:00", close: "22:00", closed: false },
      fri: { open: "06:00", close: "22:00", closed: false },
      sat: { open: "06:00", close: "22:00", closed: false },
      sun: { open: "07:00", close: "13:00", closed: false },
    },
    tone: "friendly",
    language: "english",
    leadName: contactName,
    leadPhone: "919876543210",
    leadStatus: "new",
    leadMetadata: {},
    conversationHistory: history as ChatMessage[],
    currentIntent: null,
    collectedInfo: {},
  };

  // 3. Generate reply
  const response = await generateSalesReply(ctx, message);
  const responseTime = Date.now() - startTime;

  // 4. Return with debug info
  return NextResponse.json({
    reply: response.reply,
    debug: {
      language: languageResult.language,
      tone: languageResult.tone,
      script: languageResult.script,
      confidence: languageResult.confidence,
      shouldUseEmojis: languageResult.shouldUseEmojis,
      intent: response.intent,
      aiConfidence: response.confidence,
      tokensUsed: response.tokensUsed,
      responseTimeMs: responseTime,
      actions: response.actions,
      shouldEscalate: response.shouldEscalate,
    },
  });
}
