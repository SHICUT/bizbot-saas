import { buildSystemPrompt } from "./prompts/system-prompt";
import { classifyIntentLocal } from "./prompts/intent-classifier";
import { detectLanguageAndTone } from "./prompts/language-detector";
import { AI_TOOLS } from "./tools/function-definitions";
import type {
  ConversationContext,
  AIResponse,
  AIAction,
  ConversationIntent,
  ChatMessage,
} from "./types";

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

/**
 * AI Sales Assistant — Main Orchestrator
 *
 * Key improvement: Language detection happens on EVERY message.
 * The AI adapts its language/tone dynamically based on what the customer writes.
 * No static language setting — pure mirroring.
 */
export async function generateSalesReply(
  ctx: ConversationContext,
  incomingMessage: string
): Promise<AIResponse> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return createFallbackResponse("I'll get back to you shortly!");
  }

  // 1. Detect language and tone from the incoming message
  const languageResult = detectLanguageAndTone(incomingMessage);

  // 2. Classify intent (fast local check)
  let intent: ConversationIntent = classifyIntentLocal(incomingMessage) || "unknown";

  // 3. Skip replies for acknowledgments
  if (shouldSkipReply(incomingMessage)) {
    return {
      reply: "",
      actions: [],
      intent: "follow_up",
      confidence: 1,
      shouldEscalate: false,
      tokensUsed: 0,
    };
  }

  // 4. Handle immediate escalation (in detected language)
  if (intent === "needs_human") {
    const escalationReply = getEscalationMessage(languageResult.language, ctx.businessName);
    return {
      reply: escalationReply,
      actions: [{ type: "escalate", reason: "Customer requested human support" }],
      intent: "needs_human",
      confidence: 0.95,
      shouldEscalate: true,
      tokensUsed: 0,
    };
  }

  // 5. Build system prompt with detected language
  const systemPrompt = buildSystemPrompt(ctx, languageResult);
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...ctx.conversationHistory.slice(-12),
    { role: "user", content: incomingMessage },
  ];

  // 6. Call OpenAI
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages,
        tools: AI_TOOLS,
        tool_choice: "auto",
        max_tokens: 250,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.2,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[AI Sales] OpenAI error:", error);
      return createFallbackResponse(getFallbackMessage(intent, languageResult.language));
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const tokensUsed = data.usage?.total_tokens || 0;

    if (!choice) {
      return createFallbackResponse(getFallbackMessage(intent, languageResult.language));
    }

    // 7. Process response
    const actions: AIAction[] = [];
    let reply = "";
    let shouldEscalate = false;

    if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
      for (const toolCall of choice.message.tool_calls) {
        const action = processToolCall(toolCall);
        if (action) {
          actions.push(action);
          if (action.type === "escalate") shouldEscalate = true;
        }
      }
      reply = choice.message.content || "";
      if (!reply && actions.length > 0) {
        reply = generateActionReply(actions, ctx, languageResult.language);
      }
    } else {
      reply = choice.message.content || "";
    }

    if (intent === "unknown" && actions.length > 0) {
      intent = inferIntentFromActions(actions);
    }

    return {
      reply: reply.trim(),
      actions,
      intent,
      confidence: calculateConfidence(reply, actions, intent),
      shouldEscalate,
      tokensUsed,
    };
  } catch (error) {
    console.error("[AI Sales] Failed:", error);
    return createFallbackResponse(getFallbackMessage(intent, languageResult.language));
  }
}

// ─── Tool Call Processing ───────────────────────────────────────────────────

interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

function processToolCall(toolCall: ToolCall): AIAction | null {
  try {
    const args = JSON.parse(toolCall.function.arguments);

    switch (toolCall.function.name) {
      case "book_appointment":
        return {
          type: "book_appointment",
          details: {
            title: args.title,
            service: args.service,
            scheduledAt: `${args.date}T${args.time}:00`,
            durationMinutes: args.duration_minutes || 60,
            notes: args.notes,
          },
        };
      case "collect_customer_info":
        return {
          type: "update_lead",
          data: {
            name: args.name,
            email: args.email,
            preferredService: args.preferred_service,
            budget: args.budget,
            notes: args.notes,
          },
        };
      case "escalate_to_human":
        return { type: "escalate", reason: args.reason || "AI escalation" };
      case "schedule_follow_up":
        return {
          type: "send_follow_up",
          delay_hours: args.delay_hours || 24,
          message: args.context || "Follow up on previous conversation",
        };
      case "qualify_lead":
        return {
          type: "qualify_lead",
          result: { score: args.score, status: args.status, reasoning: args.reasoning },
        };
      default:
        return null;
    }
  } catch (error) {
    console.error("[AI Sales] Failed to parse tool call:", error);
    return null;
  }
}

// ─── Language-Aware Fallbacks ───────────────────────────────────────────────

function getEscalationMessage(language: string, businessName: string): string {
  switch (language) {
    case "hindi":
      return `मैं आपको ${businessName} की टीम से जोड़ता/जोड़ती हूँ। वो जल्दी ही आपसे बात करेंगे! 🙏`;
    case "hinglish":
      return `Main aapko ${businessName} ki team se connect karta hoon. Wo jaldi aapse baat karenge! 🙏`;
    case "marathi":
      return `मी तुम्हाला ${businessName} च्या टीमशी जोडतो. ते लवकरच तुमच्याशी बोलतील! 🙏`;
    default:
      return `Let me connect you with the ${businessName} team. They'll reach out to you shortly! 🙏`;
  }
}

function getFallbackMessage(intent: ConversationIntent, language: string): string {
  if (language === "hinglish") {
    switch (intent) {
      case "greeting": return "Hey! Kaise help kar sakta hoon aapki? 👋";
      case "pricing_inquiry": return "Pricing ke baare mein bata deta hoon. Aap kis service mein interested hain?";
      case "booking_request": return "Booking ke liye bata dijiye — kab aana chahenge?";
      default: return "Ek second, main check karke batata hoon. Thodi der mein reply karta hoon!";
    }
  }
  if (language === "hindi") {
    switch (intent) {
      case "greeting": return "नमस्ते! कैसे मदद कर सकता हूँ? 👋";
      case "pricing_inquiry": return "प्राइसिंग बता देता हूँ। आप किस सर्विस में interested हैं?";
      case "booking_request": return "बुकिंग के लिए बताइए — कब आना चाहेंगे?";
      default: return "एक सेकंड, चेक करके बताता हूँ!";
    }
  }
  // English fallback
  switch (intent) {
    case "greeting": return "Hi there! How can I help you today? 👋";
    case "pricing_inquiry": return "I'd be happy to share pricing. Which service are you interested in?";
    case "booking_request": return "I'd love to help you book! What date and time works for you?";
    default: return "Let me check on that for you. I'll get back to you shortly!";
  }
}

function generateActionReply(actions: AIAction[], ctx: ConversationContext, language: string): string {
  for (const action of actions) {
    if (action.type === "book_appointment") {
      if (language === "hinglish") {
        return `Done! Aapki ${action.details.service} book ho gayi hai. Reminder bhej denge appointment se pehle! ✨`;
      }
      if (language === "hindi") {
        return `हो गया! आपकी ${action.details.service} बुक हो गई है। अपॉइंटमेंट से पहले रिमाइंडर भेज देंगे! ✨`;
      }
      return `Done! Your ${action.details.service} is booked. We'll send you a reminder before your appointment! ✨`;
    }
    if (action.type === "escalate") {
      return getEscalationMessage(language, ctx.businessName);
    }
  }
  return "";
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function createFallbackResponse(message: string): AIResponse {
  return {
    reply: message,
    actions: [],
    intent: "unknown",
    confidence: 0.3,
    shouldEscalate: false,
    tokensUsed: 0,
  };
}

function inferIntentFromActions(actions: AIAction[]): ConversationIntent {
  for (const action of actions) {
    if (action.type === "book_appointment") return "booking_request";
    if (action.type === "escalate") return "needs_human";
    if (action.type === "qualify_lead" && action.result.score >= 70) return "ready_to_buy";
  }
  return "general_question";
}

function calculateConfidence(reply: string, actions: AIAction[], intent: ConversationIntent): number {
  let confidence = 0.7;
  if (reply.length > 20) confidence += 0.1;
  if (actions.length > 0) confidence += 0.1;
  if (intent !== "unknown") confidence += 0.1;
  return Math.min(confidence, 1);
}

function shouldSkipReply(message: string): boolean {
  const skipPatterns = [
    /^(ok|okay|k|kk|hmm|hm|alright|accha|acha|theek|thik)\.?$/i,
    /^(thanks|thank you|ty|thx|thnx|dhanyavaad|shukriya|thanku)\.?$/i,
    /^(bye|goodbye|good night|gn|alvida|chalo|chal)\.?$/i,
    /^(👍|👌|🙏|✅|💯|😊|🙂|👋|🤝|🫡)$/,
    /^\.+$/,
  ];
  return skipPatterns.some((pattern) => pattern.test(message.trim()));
}
