import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSalesReply } from "@/lib/ai/sales-assistant";
import { detectLanguageAndTone } from "@/lib/ai/prompts/language-detector";
import type { ConversationContext, ChatMessage } from "@/lib/ai/types";

/**
 * POST /api/test/simulate-chat
 *
 * Chat simulator endpoint — tests the AI using REAL business data.
 * Returns the AI reply + debug information (language detection, timing, etc.)
 *
 * Body: {
 *   message: string,
 *   history?: Array<{ role: "user" | "assistant", content: string }>,
 *   contactName?: string
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  const body = await request.json();
  const {
    message,
    history = [],
    contactName = "Test Customer",
  } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  // Try to get real business data from authenticated user
  let businessContext = "";
  let businessName = "Your Business";
  let businessType = "other";
  let businessHours: Record<string, { open: string; close: string; closed: boolean }> = {};

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const admin = createAdminClient();
      const { data: business } = await admin
        .from("businesses")
        .select("name, type, business_context, business_hours")
        .eq("owner_id", user.id)
        .single();

      if (business) {
        businessContext = business.business_context || "";
        businessName = business.name || "Your Business";
        businessType = business.type || "other";
        if (business.business_hours) {
          businessHours = business.business_hours as typeof businessHours;
        }
      }
    }
  } catch {
    // If auth fails, use fallback context
  }

  // Fallback if no business data
  if (!businessContext) {
    businessContext = `This is a test business. No knowledge base has been set up yet. Please go to the Knowledge Base page to add your business information.`;
  }

  // 1. Detect language
  const languageResult = detectLanguageAndTone(message);

  // 2. Build context
  const ctx: ConversationContext = {
    businessId: "simulator",
    leadId: "simulator",
    conversationId: "simulator",
    businessName,
    businessContext,
    businessType,
    businessHours,
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
    response: response.reply, // alias for compatibility
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
