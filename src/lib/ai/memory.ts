import { createAdminClient } from "@/lib/supabase/admin";
import type { ChatMessage, CollectedInfo, ConversationContext } from "./types";

/**
 * Conversation Memory Manager
 *
 * Handles:
 * 1. Loading conversation history from database
 * 2. Building full context for the AI
 * 3. Summarizing long conversations (token optimization)
 * 4. Tracking collected information across messages
 *
 * Memory strategy:
 * - Last 12 messages: full content (recent context)
 * - Older messages: summarized into a single "memory" message
 * - Collected info: persisted in lead metadata
 */

const MAX_HISTORY_MESSAGES = 12;
const SUMMARIZE_THRESHOLD = 20; // Summarize when history exceeds this

/**
 * Load full conversation context from database.
 * Used before generating an AI reply.
 */
export async function loadConversationContext(
  businessId: string,
  leadId: string,
  conversationId: string
): Promise<ConversationContext | null> {
  const supabase = createAdminClient();

  // Parallel queries for efficiency
  const [businessResult, leadResult, messagesResult] = await Promise.all([
    supabase
      .from("businesses")
      .select("name, type, business_context, business_hours, ai_tone, ai_language")
      .eq("id", businessId)
      .single(),
    supabase
      .from("leads")
      .select("name, phone, status, metadata")
      .eq("id", leadId)
      .single(),
    supabase
      .from("messages")
      .select("direction, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(MAX_HISTORY_MESSAGES + 5), // Extra for summarization check
  ]);

  if (!businessResult.data || !leadResult.data) return null;

  const business = businessResult.data;
  const lead = leadResult.data;
  const messages = messagesResult.data || [];

  // Build conversation history (chronological order)
  const history: ChatMessage[] = messages
    .reverse()
    .slice(-MAX_HISTORY_MESSAGES)
    .map((msg) => ({
      role: msg.direction === "inbound" ? ("user" as const) : ("assistant" as const),
      content: msg.content,
    }));

  // Extract collected info from lead metadata
  const metadata = (lead.metadata || {}) as Record<string, unknown>;
  const collectedInfo: CollectedInfo = {
    name: lead.name || (metadata.name as string) || undefined,
    email: metadata.email as string | undefined,
    preferredService: metadata.preferred_service as string | undefined,
    budget: metadata.budget as string | undefined,
    notes: metadata.notes as string | undefined,
  };

  return {
    businessId,
    leadId,
    conversationId,
    businessName: business.name,
    businessContext: business.business_context || "",
    businessType: business.type || "service",
    businessHours: business.business_hours || {},
    tone: (business.ai_tone || "friendly") as "friendly" | "casual" | "formal",
    language: (business.ai_language || "english") as "english" | "hindi" | "hinglish",
    leadName: lead.name,
    leadPhone: lead.phone,
    leadStatus: lead.status,
    leadMetadata: metadata,
    conversationHistory: history,
    currentIntent: null,
    collectedInfo,
  };
}

/**
 * Summarize older messages to save tokens.
 * Called when conversation history exceeds threshold.
 *
 * Strategy: Keep last 12 messages verbatim, summarize the rest
 * into a single "context" message prepended to history.
 */
export async function summarizeOldMessages(
  conversationId: string
): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: messages } = await supabase
    .from("messages")
    .select("direction, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (!messages || messages.length <= SUMMARIZE_THRESHOLD) return null;

  // Get messages that need summarizing (everything except last 12)
  const oldMessages = messages.slice(0, -MAX_HISTORY_MESSAGES);

  // Build a simple summary without an API call (saves cost)
  const summary = buildLocalSummary(oldMessages);
  return summary;
}

/**
 * Build a local summary of old messages without an API call.
 * Extracts key information mentioned in the conversation.
 */
function buildLocalSummary(
  messages: Array<{ direction: string; content: string }>
): string {
  const customerMessages = messages
    .filter((m) => m.direction === "inbound")
    .map((m) => m.content);

  const topics: string[] = [];

  // Extract key topics mentioned
  const allText = customerMessages.join(" ").toLowerCase();

  if (/price|cost|fee|plan|membership/i.test(allText)) {
    topics.push("Asked about pricing");
  }
  if (/book|appointment|schedule|visit/i.test(allText)) {
    topics.push("Discussed booking");
  }
  if (/time|hour|when|available/i.test(allText)) {
    topics.push("Asked about timing");
  }
  if (/trial|free|demo/i.test(allText)) {
    topics.push("Interested in trial");
  }

  if (topics.length === 0) {
    topics.push(`Had ${messages.length} messages of general conversation`);
  }

  return `[Previous conversation summary: ${topics.join(". ")}. Total ${messages.length} earlier messages.]`;
}

/**
 * Update collected info in lead metadata after AI extracts information.
 */
export async function updateCollectedInfo(
  leadId: string,
  newInfo: Partial<CollectedInfo>
): Promise<void> {
  const supabase = createAdminClient();

  // Get current metadata
  const { data: lead } = await supabase
    .from("leads")
    .select("metadata, name, email")
    .eq("id", leadId)
    .single();

  if (!lead) return;

  const currentMetadata = (lead.metadata || {}) as Record<string, unknown>;
  const updates: Record<string, unknown> = {};

  // Update direct fields
  if (newInfo.name && !lead.name) updates.name = newInfo.name;
  if (newInfo.email && !lead.email) updates.email = newInfo.email;

  // Update metadata
  const metadataUpdates: Record<string, unknown> = { ...currentMetadata };
  if (newInfo.preferredService) metadataUpdates.preferred_service = newInfo.preferredService;
  if (newInfo.budget) metadataUpdates.budget = newInfo.budget;
  if (newInfo.notes) metadataUpdates.notes = newInfo.notes;
  if (newInfo.preferredDate) metadataUpdates.preferred_date = newInfo.preferredDate;
  if (newInfo.preferredTime) metadataUpdates.preferred_time = newInfo.preferredTime;

  updates.metadata = metadataUpdates;

  await supabase.from("leads").update(updates).eq("id", leadId);
}
