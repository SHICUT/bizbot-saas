import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "./client";
import { generateAIReply } from "@/lib/ai/reply-engine";
import { detectAndCreateAppointment, detectReschedule } from "@/lib/ai/appointment-detector";
import { enrichLeadFromConversation } from "@/lib/ai/lead-enricher";
import { handlePropertyMedia } from "@/lib/ai/property-media-handler";
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
  const t0 = Date.now();
  const supabase = createAdminClient();
  const timings: Record<string, number> = {};

  // ═══ PHASE 1: PARALLEL LOOKUPS (single DB round-trip) ═══
  const content = extractMessageContent(message);
  if (!content) return;

  const t1 = Date.now();
  // Run ALL initial lookups in parallel — business, lead, conversation, subscription
  const [bizResult, leadResult, convResult] = await Promise.all([
    // Business lookup
    supabase.from("businesses")
      .select("id, name, type, ai_enabled, ai_tone, ai_language, business_context, whatsapp_access_token, is_active")
      .eq("whatsapp_phone_number_id", phoneNumberId)
      .eq("is_active", true)
      .limit(1)
      .single(),
    // Lead upsert
    supabase.from("leads").upsert(
      { business_id: null as unknown as string, wa_id: message.from, phone: message.from, name: contact?.profile?.name || null, source: "whatsapp" },
      { onConflict: "business_id,wa_id", ignoreDuplicates: true }
    ).select("id, ai_paused_until, status, business_id").maybeSingle(),
    // We'll handle conversation after we have business_id
    Promise.resolve(null),
  ]);

  timings.lookup = Date.now() - t1;

  // Validate business
  const business = bizResult.data;
  if (!business) {
    // Auto-link fallback (keep existing logic but minimal)
    const { data: unlinked } = await supabase.from("businesses")
      .select("id, name, ai_enabled, ai_tone, ai_language, business_context, whatsapp_access_token, type, is_active")
      .is("whatsapp_phone_number_id", null).eq("is_active", true).limit(1).single();
    
    if (unlinked) {
      await supabase.from("businesses").update({ whatsapp_phone_number_id: phoneNumberId, whatsapp_connected: true }).eq("id", unlinked.id);
      // Recurse with linked business (one-time cost)
      return processIncomingMessage(message, contact, phoneNumberId);
    }
    console.error(`[⚡] ❌ No business for ${phoneNumberId}`);
    return;
  }

  if (!business.ai_enabled || !business.whatsapp_access_token) return;

  // ═══ PHASE 2: PARALLEL — Lead + Conversation + Subscription + Message Store ═══
  const t2 = Date.now();
  const [leadUpsert, convUpsert, subCheck, msgStore] = await Promise.all([
    // Proper lead upsert with business_id
    supabase.from("leads").upsert(
      { business_id: business.id, wa_id: message.from, phone: message.from, name: contact?.profile?.name || null, source: "whatsapp" },
      { onConflict: "business_id,wa_id" }
    ).select("id, ai_paused_until, status").single(),
    // Conversation upsert
    supabase.from("conversations").upsert(
      { business_id: business.id, lead_id: "placeholder", channel: "whatsapp", status: "active", is_ai_active: true },
      { onConflict: "business_id,lead_id,channel" }
    ).select("id, is_ai_active").maybeSingle(),
    // Subscription check
    supabase.from("subscriptions")
      .select("message_limit, messages_used, current_period_end")
      .eq("business_id", business.id).in("status", ["active", "trialing"])
      .order("created_at", { ascending: false }).limit(1).single(),
    // Store inbound message
    supabase.from("messages").upsert({
      business_id: business.id, conversation_id: "temp", lead_id: "temp",
      wa_message_id: message.id, direction: "inbound", content, message_type: message.type, status: "delivered",
    }, { onConflict: "business_id,wa_message_id", count: "exact" }),
  ]);

  // Get lead (required for conversation)
  const lead = leadUpsert.data;
  if (!lead) { console.error(`[⚡] Lead upsert failed`); return; }

  // Check subscription
  const sub = subCheck.data;
  if (!sub || sub.messages_used >= sub.message_limit) { console.error(`[⚡] Limit reached`); return; }
  if (sub.current_period_end && new Date(sub.current_period_end) < new Date()) return;

  // Now do proper conversation with real lead_id
  const { data: conversation } = await supabase.from("conversations").upsert(
    { business_id: business.id, lead_id: lead.id, channel: "whatsapp", status: "active", is_ai_active: true },
    { onConflict: "business_id,lead_id,channel" }
  ).select("id, is_ai_active").single();

  if (!conversation) return;

  // Fix message with real IDs
  await supabase.from("messages").update({ conversation_id: conversation.id, lead_id: lead.id })
    .eq("business_id", business.id).eq("wa_message_id", message.id);

  timings.db_setup = Date.now() - t2;

  // Check AI paused
  if (lead.ai_paused_until && new Date(lead.ai_paused_until) > new Date()) return;
  if (!conversation.is_ai_active) return;

  // Dedup check
  if (msgStore.count === 0) return; // Already processed

  // ═══ PHASE 3: AI GENERATION (the main bottleneck — optimize inputs) ═══
  const t3 = Date.now();

  // Get ONLY last 6 messages (not 10) for faster context
  const { data: history } = await supabase.from("messages")
    .select("direction, content").eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false }).limit(6);

  const conversationHistory = (history || []).reverse().map((m) => ({
    role: (m.direction === "inbound" ? "user" : "assistant") as "user" | "assistant",
    content: m.content,
  }));

  const replyText = await generateAIReply({
    businessContext: business.business_context || "",
    tone: business.ai_tone || "friendly",
    language: business.ai_language || "english",
    incomingMessage: content,
    conversationHistory,
    contactName: contact?.profile?.name || "Customer",
    businessId: business.id,
    businessName: business.name,
    businessType: business.type || "other",
    leadId: lead.id,
    conversationId: conversation.id,
    leadPhone: message.from,
    leadStatus: lead.status,
  });

  timings.ai = Date.now() - t3;

  if (!replyText) return;

  // ═══ PHASE 4: SEND REPLY IMMEDIATELY ═══
  const t4 = Date.now();
  const client = new WhatsAppClient({ phone_number_id: phoneNumberId, access_token: business.whatsapp_access_token, business_id: business.id });

  try {
    const sendResult = await client.sendTextMessage(message.from, replyText, message.id);
    timings.send = Date.now() - t4;
    timings.total = Date.now() - t0;

    console.log(`[⚡] REPLY SENT in ${timings.total}ms | lookup=${timings.lookup}ms db=${timings.db_setup}ms ai=${timings.ai}ms send=${timings.send}ms`);

    // ═══ PHASE 5: BACKGROUND — store & enrich (non-blocking) ═══
    const waMessageId = sendResult.messages?.[0]?.id;

    // Fire-and-forget all post-send operations
    Promise.all([
      supabase.from("messages").insert({ business_id: business.id, conversation_id: conversation.id, lead_id: lead.id, wa_message_id: waMessageId, direction: "outbound", content: replyText, message_type: "text", is_ai_generated: true, ai_model: "groq", status: "sent" }),
      supabase.rpc("increment_message_usage", { p_business_id: business.id }),
      supabase.from("conversations").update({ last_message_text: replyText.substring(0, 200), last_message_at: new Date().toISOString(), unread_count: 0 }).eq("id", conversation.id),
      client.markAsRead(message.id).catch(() => {}),
    ]).catch(() => {});

    // Background enrichment (non-blocking but logs errors)
    detectAndCreateAppointment(replyText, content, business.id, lead.id, contact?.profile?.name || null, message.from, business.type)
      .then((created) => { if (created) console.log(`[⚡] 📅 Appointment created from AI reply`); })
      .catch((err) => console.error("[⚡] Appointment detection error:", err));
    detectReschedule(replyText, content, business.id, lead.id)
      .then((rescheduled) => { if (rescheduled) console.log(`[⚡] 📅 Appointment rescheduled`); })
      .catch(() => {});
    enrichLeadFromConversation(content, replyText, business.id, lead.id, business.type || "other", conversationHistory)
      .catch((err) => console.error("[⚡] Lead enrichment error:", err));

    // Property media (images, brochures, location) — real estate only
    handlePropertyMedia({
      businessId: business.id,
      businessType: business.type || "other",
      phoneNumberId: phoneNumberId,
      accessToken: business.whatsapp_access_token,
      leadPhone: message.from,
      leadMetadata: (lead as Record<string, unknown>).metadata as Record<string, unknown> || {},
      incomingMessage: content,
      aiReply: replyText,
    }).then((count) => { if (count > 0) console.log(`[⚡] 📸 ${count} media sent`); })
      .catch((err) => console.error("[⚡] Property media error:", err));

  } catch (sendErr) {
    console.error(`[⚡] Send FAILED:`, sendErr instanceof Error ? sendErr.message : sendErr);
  }
}

/**
 * Process message status updates (sent → delivered → read → failed).
 * Meta sends these as callbacks after the message is accepted.
 */
async function processStatusUpdate(
  status: MessageStatus,
  phoneNumberId: string
): Promise<void> {
  const supabase = createAdminClient();

  // Log ALL status updates for debugging delivery issues
  console.log(`[Status] === MESSAGE STATUS UPDATE ===`);
  console.log(`[Status] Message ID: ${status.id}`);
  console.log(`[Status] Status: ${status.status}`);
  console.log(`[Status] Recipient: ${status.recipient_id}`);
  console.log(`[Status] Timestamp: ${status.timestamp}`);
  if (status.errors && status.errors.length > 0) {
    console.error(`[Status] ❌ ERROR: code=${status.errors[0].code} | title="${status.errors[0].title}" | message="${status.errors[0].message}"`);
    if (status.errors[0].error_data) {
      console.error(`[Status] Error details:`, JSON.stringify(status.errors[0].error_data));
    }
  }
  console.log(`[Status] ===============================`);

  // Find the business
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("whatsapp_phone_number_id", phoneNumberId)
    .limit(1)
    .single();

  if (!business) {
    console.warn(`[Status] No business for phone_number_id: ${phoneNumberId}`);
    return;
  }

  // Update message status in DB
  const updateData: Record<string, unknown> = { status: status.status };
  if (status.errors && status.errors.length > 0) {
    updateData.error_message = `${status.errors[0].code}: ${status.errors[0].title} — ${status.errors[0].message}`;
  }

  const { error } = await supabase
    .from("messages")
    .update(updateData)
    .eq("business_id", business.id)
    .eq("wa_message_id", status.id);

  if (error) {
    console.error(`[Status] DB update failed:`, error.message);
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
