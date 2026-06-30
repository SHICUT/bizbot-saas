import { buildSystemPrompt } from "./prompts/system-prompt";
import { classifyIntentLocal } from "./prompts/intent-classifier";
import { detectLanguageAndTone } from "./prompts/language-detector";
import { callAI } from "./gemini-client";
import type {
  ConversationContext,
  AIResponse,
  AIAction,
  ConversationIntent,
  ChatMessage,
} from "./types";

/**
 * AI Sales Assistant — Powered by Google Gemini 2.5 Flash
 *
 * Detects language per message, builds dynamic prompt, calls Gemini.
 */
export async function generateSalesReply(
  ctx: ConversationContext,
  incomingMessage: string
): Promise<AIResponse> {
  // 1. Detect language and tone
  const languageResult = detectLanguageAndTone(incomingMessage);

  // 2. Classify intent locally (fast, no API call)
  const intent: ConversationIntent = classifyIntentLocal(incomingMessage) || "unknown";

  // 3. Skip replies for acknowledgments
  if (shouldSkipReply(incomingMessage)) {
    return { reply: "", actions: [], intent: "follow_up", confidence: 1, shouldEscalate: false, tokensUsed: 0 };
  }

  // 4. Handle immediate escalation
  if (intent === "needs_human") {
    return {
      reply: getEscalationMessage(languageResult.language, ctx.businessName),
      actions: [{ type: "escalate", reason: "Customer requested human support" }],
      intent: "needs_human",
      confidence: 0.95,
      shouldEscalate: true,
      tokensUsed: 0,
    };
  }

  // 5. Build system prompt with detected language
  const systemPrompt = buildSystemPrompt(ctx, languageResult);

  // 6. If no business context at all, add safety guardrail
  if (!ctx.businessContext || ctx.businessContext.length < 30) {
    const noCtxReply = languageResult.language === "hinglish"
      ? "Abhi mere paas aapke business ki poori information nahi hai. Owner jaldi update karenge. Kya main kisi aur cheez mein help kar sakta hoon?"
      : "I don't have complete information about this business yet. Let me connect you with the team for accurate details. Is there anything else I can help with?";
    return { reply: noCtxReply, actions: [], intent, confidence: 0.3, shouldEscalate: false, tokensUsed: 0 };
  }

  // 7. Call AI (Gemini → Groq → OpenAI fallback)
  try {
    const history = ctx.conversationHistory
      .slice(-12)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    const result = await callAI(systemPrompt, history, incomingMessage);

    if (!result.text) {
      return createErrorResponse("Our AI assistant is temporarily unavailable. Please try again in a moment.");
    }

    // Calculate confidence based on context availability
    let confidence = 0.85;
    if (!ctx.businessContext || ctx.businessContext.length < 50) confidence = 0.4;
    else if (ctx.businessContext.length < 200) confidence = 0.6;
    else if (ctx.businessContext.length > 500) confidence = 0.92;

    // Check if response contains "I don't have" or similar — lower confidence
    const lowConfidencePatterns = /i don't have|information.*not available|contact.*directly|not sure about/i;
    if (lowConfidencePatterns.test(result.text)) confidence = Math.min(confidence, 0.5);

    return {
      reply: result.text,
      actions: [],
      intent,
      confidence,
      shouldEscalate: false,
      tokensUsed: result.tokensUsed,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[AI Sales] All providers failed:", msg);

    // Friendly user-facing messages
    if (msg.includes("No AI provider configured")) {
      return createErrorResponse("AI assistant is not configured yet. Please contact support.");
    }
    return createErrorResponse("Our AI assistant is temporarily busy. Please try again in a moment.");
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createErrorResponse(friendlyMessage: string): AIResponse {
  return {
    reply: friendlyMessage,
    actions: [],
    intent: "unknown",
    confidence: 0,
    shouldEscalate: false,
    tokensUsed: 0,
  };
}

function getEscalationMessage(language: string, businessName: string): string {
  switch (language) {
    case "hindi":
      return `मैं आपको ${businessName} की टीम से जोड़ता हूँ। वो जल्दी ही आपसे बात करेंगे! 🙏`;
    case "hinglish":
      return `Main aapko ${businessName} ki team se connect karta hoon. Wo jaldi aapse baat karenge! 🙏`;
    default:
      return `Let me connect you with the ${businessName} team. They'll reach out shortly! 🙏`;
  }
}

function shouldSkipReply(message: string): boolean {
  // Only skip messages that are PURELY acknowledgments with no actionable intent.
  // Do NOT skip confirmations like "ok book it", "theek hai", "haan" — those need AI response.
  const trimmed = message.trim();
  
  // Only skip single emojis that are clearly just reactions
  if (/^(👍|👌|💯|🙂|🤝|🫡)$/.test(trimmed)) return true;
  
  // Only skip explicit goodbyes
  if (/^(bye|goodbye|good night|gn|alvida)\.?$/i.test(trimmed)) return true;
  
  // Only skip "thanks" when it's clearly a conversation ender
  if (/^(thanks|thank you|ty|thx|dhanyavaad|shukriya|thanku)[\s!.]*$/i.test(trimmed) && trimmed.length < 20) return true;
  
  // Skip dots only
  if (/^\.+$/.test(trimmed)) return true;
  
  return false;
}
