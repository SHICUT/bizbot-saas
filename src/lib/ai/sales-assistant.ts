import { buildSystemPrompt } from "./prompts/system-prompt";
import { classifyIntentLocal } from "./prompts/intent-classifier";
import { detectLanguageAndTone } from "./prompts/language-detector";
import { callGemini } from "./gemini-client";
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

  // 6. Call Gemini
  try {
    const history = ctx.conversationHistory
      .slice(-12)
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
    const result = await callGemini(systemPrompt, history, incomingMessage);

    if (!result.text) {
      return createErrorResponse("AI did not generate a response. Please try again.");
    }

    return {
      reply: result.text,
      actions: [],
      intent,
      confidence: 0.85,
      shouldEscalate: false,
      tokensUsed: result.tokensUsed,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[AI Sales] Gemini error:", msg);
    return createErrorResponse(msg);
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createErrorResponse(errorMessage: string): AIResponse {
  return {
    reply: `⚠️ AI Error: ${errorMessage}`,
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
  const skipPatterns = [
    /^(ok|okay|k|kk|hmm|hm|alright|accha|acha|theek|thik)\.?$/i,
    /^(thanks|thank you|ty|thx|dhanyavaad|shukriya|thanku)\.?$/i,
    /^(bye|goodbye|good night|gn|alvida|chalo|chal)\.?$/i,
    /^(👍|👌|🙏|✅|💯|😊|🙂|👋|🤝|🫡)$/,
    /^\.+$/,
  ];
  return skipPatterns.some((p) => p.test(message.trim()));
}
