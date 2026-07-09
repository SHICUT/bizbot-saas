/**
 * AI Reply Engine — Entry Point
 *
 * Used by WhatsApp handler, Instagram handler, and Chat Simulator.
 * All use the same Gemini-powered pipeline.
 */

import { generateSalesReply } from "./sales-assistant";
import { executeActions } from "./action-executor";
import { getRecommendationContext } from "./property-media-handler";
import { buildIntelligenceContext } from "./real-estate-intelligence";
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
 * Generate an AI reply using Google Gemini.
 * Returns null only for skip-reply messages (ok, thanks, bye).
 * Returns error message string if Gemini fails.
 */
export async function generateAIReply(input: SimpleReplyInput): Promise<string | null> {
  // For real_estate businesses, inject live property recommendations + intelligence into context
  let enrichedContext = input.businessContext;
  if (input.businessType === "real_estate" && input.businessId && input.leadMetadata) {
    try {
      const [recoContext, intelligenceContext] = await Promise.all([
        getRecommendationContext(input.businessId, input.leadMetadata),
        buildIntelligenceContext(
          input.businessId,
          input.leadMetadata,
          input.conversationHistory
        ),
      ]);
      if (recoContext) {
        enrichedContext += `\n\n# MATCHING PROPERTIES (from database — use these for recommendations)\n${recoContext}`;
      }
      if (intelligenceContext) {
        enrichedContext += `\n${intelligenceContext}`;
      }
    } catch (e) {
      console.warn("[ReplyEngine] Real estate intelligence injection failed (non-fatal):", e);
    }
  }

  const ctx: ConversationContext = {
    businessId: input.businessId || "",
    leadId: input.leadId || "",
    conversationId: input.conversationId || "",
    businessName: input.businessName || "Our Business",
    businessContext: enrichedContext,
    businessType: input.businessType || "service",
    businessHours: input.businessHours || {},
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
