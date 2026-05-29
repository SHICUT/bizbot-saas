import { createAdminClient } from "@/lib/supabase/admin";
import { InstagramClient } from "./client";
import { generateAIReply } from "@/lib/ai/reply-engine";
import type { IGWebhookPayload, IGMessagingEvent } from "./types";

/**
 * Instagram Message Handler
 *
 * Processes incoming Instagram DMs through the same pipeline as WhatsApp:
 * 1. Route to business (by Instagram account ID)
 * 2. Check subscription limits
 * 3. Upsert lead (source: instagram)
 * 4. Upsert conversation (channel: instagram)
 * 5. Store inbound message
 * 6. Generate AI reply
 * 7. Send reply via Instagram API
 * 8. Store outbound message
 *
 * The AI engine, lead qualification, and follow-up systems are shared
 * across all channels — only the transport layer differs.
 */
export async function processInstagramWebhook(payload: IGWebhookPayload): Promise<void> {
  for (const entry of payload.entry) {
    if (!entry.messaging) continue;

    for (const event of entry.messaging) {
      // Skip echoes (messages we sent), reads, and reactions
      if (event.message?.is_echo) continue;
      if (!event.message?.text && !event.message?.attachments) continue;
      if (event.message?.is_deleted) continue;

      await processIncomingDM(event, entry.id);
    }
  }
}

async function processIncomingDM(event: IGMessagingEvent, igAccountId: string): Promise<void> {
  const supabase = createAdminClient();
  const senderId = event.sender.id;
  const messageText = event.message?.text || extractAttachmentText(event);

  if (!messageText) return;

  // 1. Find business by Instagram account ID
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("id, name, ai_enabled, ai_tone, ai_language, ai_pause_duration, business_context, instagram_page_id, instagram_access_token")
    .eq("instagram_account_id", igAccountId)
    .eq("is_active", true)
    .single();

  if (bizError || !business) {
    console.error(`[Instagram] No business found for IG account: ${igAccountId}`);
    return;
  }

  // 2. Check subscription limit
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("message_limit, messages_used")
    .eq("business_id", business.id)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!sub || sub.messages_used >= sub.message_limit) {
    console.warn(`[Instagram] Message limit reached for business: ${business.id}`);
    return;
  }

  // 3. Get sender profile (for name)
  let senderName: string | null = null;
  try {
    const client = new InstagramClient({
      page_id: business.instagram_page_id,
      access_token: business.instagram_access_token,
      business_id: business.id,
    });
    const profile = await client.getUserProfile(senderId);
    senderName = profile.name || profile.username || null;
  } catch {
    // Profile fetch failed — continue without name
  }

  // 4. Upsert lead (source: instagram)
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .upsert(
      {
        business_id: business.id,
        wa_id: `ig_${senderId}`, // Prefix to distinguish from WhatsApp IDs
        phone: `ig_${senderId}`,
        name: senderName,
        source: "instagram",
      },
      { onConflict: "business_id,wa_id" }
    )
    .select("id, ai_paused_until, status")
    .single();

  if (leadError || !lead) {
    console.error(`[Instagram] Failed to upsert lead:`, leadError);
    return;
  }

  // Update first_message_at if new
  if (lead.status === "new") {
    await supabase
      .from("leads")
      .update({ first_message_at: new Date().toISOString(), status: "contacted" })
      .eq("id", lead.id);
  }

  // 5. Upsert conversation (channel: instagram)
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .upsert(
      {
        business_id: business.id,
        lead_id: lead.id,
        channel: "instagram",
        status: "active",
        channel_metadata: { ig_sender_id: senderId, ig_account_id: igAccountId },
      },
      { onConflict: "business_id,lead_id,channel" }
    )
    .select("id, is_ai_active")
    .single();

  if (convError || !conversation) {
    console.error(`[Instagram] Failed to upsert conversation:`, convError);
    return;
  }

  // 6. Store inbound message
  const messageId = event.message?.mid || `ig_${Date.now()}`;
  await supabase.from("messages").upsert(
    {
      business_id: business.id,
      conversation_id: conversation.id,
      lead_id: lead.id,
      wa_message_id: messageId,
      direction: "inbound",
      content: messageText,
      message_type: "text",
      source_channel: "instagram",
      status: "delivered",
    },
    { onConflict: "business_id,wa_message_id" }
  );

  // 7. Increment usage
  await supabase.rpc("increment_message_usage", { p_business_id: business.id });

  // 8. Check if AI should reply
  if (!business.ai_enabled || !conversation.is_ai_active) return;
  if (lead.ai_paused_until && new Date(lead.ai_paused_until) > new Date()) return;

  // 9. Generate AI reply (same engine as WhatsApp)
  try {
    const history = await getConversationHistory(supabase, conversation.id);

    const replyText = await generateAIReply({
      businessContext: business.business_context || "",
      tone: business.ai_tone || "friendly",
      language: business.ai_language || "english",
      incomingMessage: messageText,
      conversationHistory: history,
      contactName: senderName || "Customer",
      businessId: business.id,
      leadId: lead.id,
      conversationId: conversation.id,
      businessName: business.name,
    });

    if (!replyText) return;

    // 10. Send reply via Instagram
    const client = new InstagramClient({
      page_id: business.instagram_page_id,
      access_token: business.instagram_access_token,
      business_id: business.id,
    });

    const sendResult = await client.sendTextMessage(senderId, replyText);

    // 11. Store outbound message
    await supabase.from("messages").insert({
      business_id: business.id,
      conversation_id: conversation.id,
      lead_id: lead.id,
      wa_message_id: sendResult.message_id,
      direction: "outbound",
      content: replyText,
      message_type: "text",
      source_channel: "instagram",
      is_ai_generated: true,
      ai_model: "gpt-4o-mini",
      status: "sent",
    });

    await supabase.rpc("increment_message_usage", { p_business_id: business.id });
  } catch (error) {
    console.error(`[Instagram] AI reply failed:`, error);
  }
}

function extractAttachmentText(event: IGMessagingEvent): string | null {
  const attachments = event.message?.attachments;
  if (!attachments || attachments.length === 0) return null;

  const first = attachments[0];
  switch (first.type) {
    case "image": return "[Image]";
    case "video": return "[Video]";
    case "audio": return "[Audio]";
    case "story_mention": return "[Story mention]";
    default: return "[Attachment]";
  }
}

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
  return messages.reverse().map((msg) => ({
    role: msg.direction === "inbound" ? ("user" as const) : ("assistant" as const),
    content: msg.content,
  }));
}
