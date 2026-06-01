import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "./client";
import { generateAIReply } from "@/lib/ai/reply-engine";
import { cacheGet, cacheSet } from "@/lib/cache";
import type {
  WebhookPayload,
  IncomingMessage,
  WebhookContact,
  MessageStatus,
} from "./types";

/**
 * Core message processing pipeline.
 * Handles the full lifecycle of an incoming WhatsApp message:
 *
 * 1. Route to business (by phone_number_id)
 * 2. Check subscription limits
 * 3. Upsert lead (new contact = new lead)
 * 4. Upsert conversation
 * 5. Store inbound message
 * 6. Generate AI reply (if enabled)
 * 7. Send reply via WhatsApp
 * 8. Store outbound message
 */
export async function processWebhookPayload(payload: WebhookPayload): Promise<void> {
  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      const value = change.value;

      // Handle incoming messages
      if (value.messages && value.messages.length > 0) {
        for (const message of value.messages) {
          const contact = value.contacts?.[0];
          const phoneNumberId = value.metadata.phone_number_id;

          await processIncomingMessage(message, contact, phoneNumberId);
        }
      }

      // Handle status updates (sent, delivered, read)
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          await processStatusUpdate(status, value.metadata.phone_number_id);
        }
      }
    }
  }
}

/**
 * Process a single incoming message.
 */
async function processIncomingMessage(
  message: IncomingMessage,
  contact: WebhookContact | undefined,
  phoneNumberId: string
): Promise<void> {
  const supabase = createAdminClient();

  // 1. Find business (cached for 5 min to avoid repeated lookups)
  const cacheKey = `biz_${phoneNumberId}`;
  let business = cacheGet<{ id: string; name: string; type: string; ai_enabled: boolean; ai_tone: string; ai_language: string; ai_pause_duration: number; business_context: string; whatsapp_access_token: string }>(cacheKey);

  if (!business) {
    const { data, error: bizError } = await supabase
      .from("businesses")
      .select("id, name, type, ai_enabled, ai_tone, ai_language, ai_pause_duration, business_context, whatsapp_access_token")
      .eq("whatsapp_phone_number_id", phoneNumberId)
      .eq("is_active", true)
      .single();

    if (bizError || !data) {
      console.error(`[Webhook] No business for phone_number_id: ${phoneNumberId}`);
      return;
    }
    business = data;
    cacheSet(cacheKey, business);
  }

  // 2-3. Check subscription + Upsert lead (PARALLEL)
  const [canSend, leadResult] = await Promise.all([
    checkMessageLimit(supabase, business.id),
    supabase.from("leads").upsert(
      { business_id: business.id, wa_id: message.from, phone: message.from, name: contact?.profile?.name || null, source: "whatsapp" },
      { onConflict: "business_id,wa_id" }
    ).select("id, ai_paused_until, status").single(),
  ]);

  if (!canSend) {
    console.warn(`[Webhook] Message limit reached for business: ${business.id}`);
    return;
  }

  const lead = leadResult.data;
  if (!lead) {
    console.error(`[Webhook] Failed to upsert lead`);
    return;
  }

  // Update lead first_message_at if new
  if (lead.status === "new") {
    await supabase
      .from("leads")
      .update({ first_message_at: new Date().toISOString(), status: "contacted" })
      .eq("id", lead.id);
  }

  // 4. Upsert conversation
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .upsert(
      {
        business_id: business.id,
        lead_id: lead.id,
        channel: "whatsapp",
        status: "active",
      },
      { onConflict: "business_id,lead_id,channel" }
    )
    .select("id, is_ai_active")
    .single();

  if (convError || !conversation) {
    console.error(`[Webhook] Failed to upsert conversation:`, convError);
    return;
  }

  // 5. Extract message content
  const content = extractMessageContent(message);
  if (!content) return; // Skip unsupported message types

  // 6. Store inbound message (dedup by wa_message_id)
  const { error: msgError } = await supabase.from("messages").upsert(
    {
      business_id: business.id,
      conversation_id: conversation.id,
      lead_id: lead.id,
      wa_message_id: message.id,
      direction: "inbound",
      content,
      message_type: message.type,
      status: "delivered",
    },
    { onConflict: "business_id,wa_message_id" }
  );

  if (msgError) {
    console.error(`[Webhook] Failed to store message:`, msgError);
    return;
  }

  // 7. Increment message usage
  await supabase.rpc("increment_message_usage", { p_business_id: business.id });

  // 8. Check if AI should reply
  const shouldReply = await shouldAIReply(business, lead, conversation);
  if (!shouldReply) return;

  // 9. Generate AI reply (full sales assistant context)
  try {
    const replyText = await generateAIReply({
      businessContext: business.business_context || "",
      tone: business.ai_tone || "friendly",
      language: business.ai_language || "english",
      incomingMessage: content,
      conversationHistory: await getConversationHistory(supabase, conversation.id),
      contactName: contact?.profile?.name || "Customer",
      businessId: business.id,
      businessName: business.name,
      businessType: business.type || "other",
      leadId: lead.id,
      conversationId: conversation.id,
      leadPhone: message.from,
      leadStatus: lead.status,
    });

    if (!replyText) return;

    // 10. Send reply via WhatsApp
    const client = new WhatsAppClient({
      phone_number_id: phoneNumberId,
      access_token: business.whatsapp_access_token,
      business_id: business.id,
    });

    const sendResult = await client.sendTextMessage(
      message.from,
      replyText,
      message.id // reply to the specific message
    );

    // 11. Store outbound message
    const waMessageId = sendResult.messages[0]?.id;
    await supabase.from("messages").insert({
      business_id: business.id,
      conversation_id: conversation.id,
      lead_id: lead.id,
      wa_message_id: waMessageId,
      direction: "outbound",
      content: replyText,
      message_type: "text",
      is_ai_generated: true,
      ai_model: "gpt-4o-mini",
      status: "sent",
    });

    // 12. Increment usage for outbound
    await supabase.rpc("increment_message_usage", { p_business_id: business.id });

    // 13. Mark incoming message as read
    await client.markAsRead(message.id);
  } catch (error) {
    console.error(`[Webhook] AI reply failed:`, error);
    // Don't throw — we already stored the inbound message successfully
  }
}

/**
 * Process message status updates (sent → delivered → read).
 */
async function processStatusUpdate(
  status: MessageStatus,
  phoneNumberId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Find the business
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("whatsapp_phone_number_id", phoneNumberId)
    .single();

  if (!business) return;

  // Update message status
  const { error } = await supabase
    .from("messages")
    .update({
      status: status.status,
      ...(status.errors && {
        error_message: status.errors[0]?.message || "Unknown error",
      }),
    })
    .eq("business_id", business.id)
    .eq("wa_message_id", status.id);

  if (error) {
    console.error(`[Webhook] Failed to update message status:`, error);
  }
}

/**
 * Determine if AI should reply to this message.
 */
async function shouldAIReply(
  business: { ai_enabled: boolean; ai_pause_duration: number },
  lead: { ai_paused_until: string | null },
  conversation: { is_ai_active: boolean }
): Promise<boolean> {
  // AI globally disabled
  if (!business.ai_enabled) return false;

  // AI disabled for this conversation
  if (!conversation.is_ai_active) return false;

  // AI paused (owner recently replied manually)
  if (lead.ai_paused_until) {
    const pausedUntil = new Date(lead.ai_paused_until);
    if (pausedUntil > new Date()) return false;
  }

  return true;
}

/**
 * Extract text content from different message types.
 */
function extractMessageContent(message: IncomingMessage): string | null {
  switch (message.type) {
    case "text":
      return message.text?.body || null;
    case "button":
      return message.button?.text || null;
    case "interactive":
      return (
        message.interactive?.button_reply?.title ||
        message.interactive?.list_reply?.title ||
        null
      );
    case "image":
      return message.image?.caption || "[Image]";
    case "audio":
      return "[Audio message]";
    case "video":
      return message.video?.caption || "[Video]";
    case "document":
      return message.document?.caption || `[Document: ${message.document?.filename || "file"}]`;
    case "location":
      return `[Location: ${message.location?.name || message.location?.address || "shared location"}]`;
    default:
      return null;
  }
}

/**
 * Get recent conversation history for AI context.
 */
async function getConversationHistory(
  supabase: ReturnType<typeof createAdminClient>,
  conversationId: string
): Promise<Array<{ role: "user" | "assistant"; content: string }>> {
  const { data: messages } = await supabase
    .from("messages")
    .select("direction, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (!messages) return [];

  // Reverse to get chronological order, map to chat format
  return messages.reverse().map((msg) => ({
    role: msg.direction === "inbound" ? ("user" as const) : ("assistant" as const),
    content: msg.content,
  }));
}

/**
 * Check if business has remaining message quota.
 */
async function checkMessageLimit(
  supabase: ReturnType<typeof createAdminClient>,
  businessId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("subscriptions")
    .select("message_limit, messages_used, current_period_end")
    .eq("business_id", businessId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) return false;

  // Check expiry
  if (data.current_period_end && new Date(data.current_period_end) < new Date()) {
    console.log("[Webhook] Subscription expired for business:", businessId);
    return false;
  }

  // Check message limit
  if (data.messages_used >= data.message_limit) {
    console.log("[Webhook] Message limit reached:", data.messages_used, "/", data.message_limit);
    return false;
  }

  return true;
}
