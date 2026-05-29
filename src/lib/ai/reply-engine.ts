/**
 * AI Reply Engine — Entry Point
 *
 * Interface used by the webhook message handler.
 * Bridges message handler → language detection → sales assistant → actions.
 */

import { generateSalesReply } from "./sales-assistant";
import { executeActions } from "./action-executor";
import type { ConversationContext, ChatMessage } from "./types";

interface SimpleReplyInput {
  businessContext: string;
  tone: string;
  language: string;
  incomingMessage: string;
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>;
  contactName: string;
  businessId?: string;
  leadId?: string;
  conversationId?: string;
  businessName?: string;
  businessType?: string;
  businessHours?: Record<string, { open: string; close: string; closed: boolean }>;
  leadPhone?: string;
  leadStatus?: string;
  leadMetadata?: Record<string, unknown>;
}

/**
 * Generate an AI reply for an incoming WhatsApp message.
 * Language is auto-detected from the message — no static setting needed.
 */
export async function generateAIReply(input: SimpleReplyInput): Promise<string | null> {
  const ctx: ConversationContext = {
    businessId: input.businessId || "",
    leadId: input.leadId || "",
    conversationId: input.conversationId || "",
    businessName: input.businessName || "Our Business",
    businessContext: input.businessContext,
    businessType: input.businessType || "service",
    businessHours: input.businessHours || {},
    // Language/tone are now detected per-message, not from config
    tone: (input.tone as "friendly" | "casual" | "formal") || "friendly",
    language: (input.language as "english" | "hindi" | "hinglish") || "english",
    leadName: input.contactName || null,
    leadPhone: input.leadPhone || "",
    leadStatus: input.leadStatus || "new",
    leadMetadata: input.leadMetadata || {},
    conversationHistory: input.conversationHistory as ChatMessage[],
    currentIntent: null,
    collectedInfo: {},
  };

  const response = await generateSalesReply(ctx, input.incomingMessage);

  // Execute actions (booking, qualification, etc.)
  if (response.actions.length > 0 && input.businessId && input.leadId && input.conversationId) {
    executeActions(response, input.businessId, input.leadId, input.conversationId).catch(
      (error) => console.error("[ReplyEngine] Action execution failed:", error)
    );
  }

  if (!response.reply) return null;
  return response.reply;
}
