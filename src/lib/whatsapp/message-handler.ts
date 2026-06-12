import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "./client";
import { generateAIReply } from "@/lib/ai/reply-engine";
import { detectAndCreateAppointment } from "@/lib/ai/appointment-detector";
import { enrichLeadFromConversation } from "@/lib/ai/lead-enricher";
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

  // 1. Find business (ALWAYS fresh from DB — no cache on serverless)
  console.log(`[Webhook] === INCOMING MESSAGE ===`);
  console.log(`[Webhook] Phone Number ID (from webhook): ${phoneNumberId}`);
  console.log(`[Webhook] From: ${message.from} | Type: ${message.type} | MsgID: ${message.id}`);

  const { data: bizData, error: bizError } = await supabase
    .from("businesses")
    .select("id, name, type, ai_enabled, ai_tone, ai_language, ai_pause_duration, business_context, whatsapp_access_token")
    .eq("whatsapp_phone_number_id", phoneNumberId)
    .eq("is_active", true)
    .single();

  if (bizError || !bizData) {
    console.error(`[Webhook] ❌ No business found for phone_number_id: ${phoneNumberId} | Error: ${bizError?.message || "no match"}`);
    return;
  }

  const business = bizData;
  console.log(`[Webhook] ✓ Business: ${business.name} (${business.id.substring(0, 8)})`);
  console.log(`[Webhook] Token: ${business.whatsapp_access_token ? business.whatsapp_access_token.substring(0, 12) + "...(" + business.whatsapp_access_token.length + ")" : "NONE"}`);
  console.log(`[Webhook] AI Enabled: ${business.ai_enabled} | Context: ${business.business_context?.length || 0} chars`);

  // 2-3. Check subscription + Upsert lead (PARALLEL)
  console.log(`[Webhook] Step 2: Checking subscription + upserting lead...`);
  const [canSend, leadResult] = await Promise.all([
    checkMessageLimit(supabase, business.id),
    supabase.from("leads").upsert(
      { business_id: business.id, wa_id: message.from, phone: message.from, name: contact?.profile?.name || null, source: "whatsapp" },
      { onConflict: "business_id,wa_id" }
    ).select("id, ai_paused_until, status").single(),
  ]);

  if (!canSend) {
    console.error(`[Webhook] ❌ STOPPED: Message limit reached for business: ${business.id}`);
    return;
  }
  console.log(`[Webhook] ✓ Subscription OK — can send`);

  const lead = leadResult.data;
  if (!lead) {
    console.error(`[Webhook] ❌ STOPPED: Failed to upsert lead. Error: ${leadResult.error?.message || "unknown"}`);
    return;
  }
  console.log(`[Webhook] ✓ Lead: ${lead.id.substring(0, 8)} | Status: ${lead.status} | Paused: ${lead.ai_paused_until || "no"}`);

  // Update lead first_message_at if new
  if (lead.status === "new") {
    await supabase.from("leads").update({ first_message_at: new Date().toISOString(), status: "contacted" }).eq("id", lead.id);
  }

  // 4. Upsert conversation (always set AI active when customer messages)
  console.log(`[Webhook] Step 4: Upserting conversation...`);
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .upsert(
      { business_id: business.id, lead_id: lead.id, channel: "whatsapp", status: "active", is_ai_active: true },
      { onConflict: "business_id,lead_id,channel" }
    )
    .select("id, is_ai_active")
    .single();

  if (convError || !conversation) {
    console.error(`[Webhook] ❌ STOPPED: Conversation upsert failed:`, convError?.message || "no data");
    return;
  }

  // If conversation existed but AI was paused, re-enable it (customer is messaging)
  if (!conversation.is_ai_active) {
    console.log(`[Webhook] ⚠ AI was inactive — re-enabling for this conversation`);
    await supabase.from("conversations").update({ is_ai_active: true }).eq("id", conversation.id);
    conversation.is_ai_active = true;
  }

  console.log(`[Webhook] ✓ Conversation: ${conversation.id.substring(0, 8)} | AI Active: ${conversation.is_ai_active}`);

  // 5. Extract message content
  const content = extractMessageContent(message);
  if (!content) {
    console.log(`[Webhook] ⏭ STOPPED: Unsupported message type: ${message.type}`);
    return;
  }
  console.log(`[Webhook] ✓ Content: "${content.substring(0, 80)}"`);

  // 6. Store inbound message (dedup by wa_message_id)
  console.log(`[Webhook] Step 6: Storing message (dedup check)...`);
  const { error: msgError, count: insertCount } = await supabase.from("messages").upsert(
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
    { onConflict: "business_id,wa_message_id", count: "exact" }
  );

  if (msgError) {
    console.error(`[Webhook] ❌ STOPPED: Message store failed:`, msgError.message);
    return;
  }

  if (insertCount === 0) {
    console.log(`[Webhook] ⏭ STOPPED: Duplicate message ${message.id} — already processed`);
    return;
  }
  console.log(`[Webhook] ✓ Message stored (new, not duplicate)`);

  // 6b. Update conversation and lead metadata (parallelized)
  await Promise.all([
    supabase.from("conversations").update({
      last_message_text: content.substring(0, 200),
      last_message_at: new Date().toISOString(),
    }).eq("id", conversation.id),
    supabase.rpc("increment_unread_count", { p_conversation_id: conversation.id }).then(() => {}, () => {
      supabase.from("conversations").update({ unread_count: 1 }).eq("id", conversation.id);
    }),
    supabase.from("leads").update({
      last_message_at: new Date().toISOString(),
    }).eq("id", lead.id),
  ]);

  // 7. (Inbound messages no longer count toward usage — only AI replies do)

  // 8. Check if AI should reply
  console.log(`[Webhook] Step 8: Checking shouldAIReply...`);
  const shouldReply = await shouldAIReply(business, lead, conversation);
  if (!shouldReply) {
    console.log(`[Webhook] ⏭ STOPPED: shouldAIReply returned false`);
    return;
  }
  console.log(`[Webhook] ✓ AI should reply`);

  // 9. Generate AI reply
  console.log(`[Webhook] Step 9: Generating AI response...`);
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

    console.log(`[Webhook] Step 9 complete. AI reply: ${replyText ? `"${replyText.substring(0, 60)}..." (${replyText.length} chars)` : "NULL/EMPTY — skipping send"}`);

    if (!replyText) {
      console.log(`[Webhook] ⏭ STOPPED: AI returned empty/null reply (message was likely an acknowledgment like 'ok', 'thanks')`);
      return;
    }

    // 10. Send reply via WhatsApp
    console.log(`[Webhook] Step 10: Sending WhatsApp reply...`);
    console.log(`[Webhook] To: ${message.from}`);
    console.log(`[Webhook] Phone Number ID: ${phoneNumberId}`);
    console.log(`[Webhook] Token: ${business.whatsapp_access_token?.substring(0, 12)}...(${business.whatsapp_access_token?.length || 0})`);

    const client = new WhatsAppClient({
      phone_number_id: phoneNumberId,
      access_token: business.whatsapp_access_token,
      business_id: business.id,
    });

    try {
      const sendResult = await client.sendTextMessage(
        message.from,
        replyText,
        message.id
      );
      console.log(`[Webhook] ✓ Reply sent! Message ID: ${sendResult.messages?.[0]?.id}`);

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
        ai_model: "gemini-2.0-flash",
        status: "sent",
      });

      // 12-14. Post-send operations (parallelized for speed)
      await Promise.all([
        // Increment AI reply usage
        supabase.rpc("increment_message_usage", { p_business_id: business.id }),
        // Update conversation with AI reply as last message
        supabase.from("conversations").update({
          last_message_text: replyText.substring(0, 200),
          last_message_at: new Date().toISOString(),
          unread_count: 0,
        }).eq("id", conversation.id),
        // Mark incoming message as read
        client.markAsRead(message.id).catch(() => {}),
      ]);

      // 15. Detect appointment bookings in AI reply and create records
      detectAndCreateAppointment(
        replyText,
        content,
        business.id,
        lead.id,
        contact?.profile?.name || null,
        message.from,
        business.type
      ).catch((err) => console.error("[Webhook] Appointment detection failed:", err));

      // 16. Enrich lead data from conversation (extract fields, score, stage)
      enrichLeadFromConversation(
        content,
        replyText,
        business.id,
        lead.id,
        business.type || "other",
        await getConversationHistory(supabase, conversation.id)
      ).catch((err) => console.error("[Webhook] Lead enrichment failed:", err));

    } catch (sendErr) {
      console.error(`[Webhook] ❌ Send FAILED:`, sendErr instanceof Error ? sendErr.message : sendErr);
      console.error(`[Webhook] This usually means the access token doesn't have permission for this phone_number_id`);
    }
  } catch (error) {
    console.error(`[Webhook] AI reply generation failed:`, error);
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
  if (!business.ai_enabled) {
    console.log(`[Webhook] Skip reason: ai_enabled=false`);
    return false;
  }
  if (!conversation.is_ai_active) {
    console.log(`[Webhook] Skip reason: conversation.is_ai_active=false`);
    return false;
  }
  if (lead.ai_paused_until) {
    const pausedUntil = new Date(lead.ai_paused_until);
    if (pausedUntil > new Date()) {
      console.log(`[Webhook] Skip reason: AI paused until ${pausedUntil.toISOString()}`);
      return false;
    }
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
 * Check if business has remaining AI reply quota.
 * Only AI-generated outbound messages count toward the limit.
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
