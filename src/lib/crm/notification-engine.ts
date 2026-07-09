/**
 * Sales Notification Engine
 *
 * Sends notifications across multiple channels:
 * - Dashboard (stored in notifications table)
 * - WhatsApp (to business owner / assigned salesperson)
 * - Email (future — requires SMTP config)
 *
 * Triggers:
 * - new_lead: New lead from any source
 * - hot_lead: Lead score crossed 70+
 * - qualified: Lead status changed to qualified
 * - site_visit: Site visit booked
 * - booking: Property booked/converted
 * - cancellation: Appointment cancelled
 * - reassigned: Lead assigned to new salesperson
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "@/lib/whatsapp/client";

export interface NotificationPayload {
  businessId: string;
  type: "new_lead" | "hot_lead" | "qualified" | "site_visit" | "booking" | "cancellation" | "reassigned";
  title: string;
  body?: string;
  recipientId?: string; // team_member id (null = owner)
  metadata?: Record<string, unknown>;
}

/**
 * Send a notification across all configured channels.
 * Non-blocking — failures are logged, not thrown.
 */
export async function sendNotification(payload: NotificationPayload): Promise<void> {
  const supabase = createAdminClient();
  const channels: string[] = [];

  // 1. Always store in dashboard notifications
  try {
    await supabase.from("notifications").insert({
      business_id: payload.businessId,
      recipient_id: payload.recipientId || null,
      type: payload.type,
      title: payload.title,
      body: payload.body || null,
      metadata: payload.metadata || {},
      channels: ["dashboard"],
    });
    channels.push("dashboard");
  } catch (e) {
    console.error("[Notify] Dashboard save failed:", e);
  }

  // 2. WhatsApp notification to business owner
  try {
    const { data: business } = await supabase
      .from("businesses")
      .select("phone, whatsapp_phone_number_id, whatsapp_access_token, name")
      .eq("id", payload.businessId)
      .single();

    if (business?.phone && business.whatsapp_phone_number_id && business.whatsapp_access_token) {
      const client = new WhatsAppClient({
        phone_number_id: business.whatsapp_phone_number_id,
        access_token: business.whatsapp_access_token,
        business_id: payload.businessId,
      });

      const message = formatNotificationMessage(payload, business.name);
      await client.sendTextMessage(business.phone, message);
      channels.push("whatsapp");
    }
  } catch (e) {
    console.warn("[Notify] WhatsApp notification failed (non-critical):", e);
  }

  // 3. WhatsApp notification to assigned team member (if different from owner)
  if (payload.recipientId) {
    try {
      const { data: member } = await supabase
        .from("team_members")
        .select("wa_id, name")
        .eq("id", payload.recipientId)
        .single();

      if (member?.wa_id) {
        const { data: business } = await supabase
          .from("businesses")
          .select("whatsapp_phone_number_id, whatsapp_access_token, name")
          .eq("id", payload.businessId)
          .single();

        if (business?.whatsapp_phone_number_id && business.whatsapp_access_token) {
          const client = new WhatsAppClient({
            phone_number_id: business.whatsapp_phone_number_id,
            access_token: business.whatsapp_access_token,
            business_id: payload.businessId,
          });

          const message = formatNotificationMessage(payload, business.name);
          await client.sendTextMessage(member.wa_id, message);
          channels.push("whatsapp_agent");
        }
      }
    } catch (e) {
      console.warn("[Notify] Agent WhatsApp notification failed:", e);
    }
  }

  // Update notification record with channels used
  if (channels.length > 1) {
    await supabase.from("notifications")
      .update({ channels })
      .eq("business_id", payload.businessId)
      .eq("type", payload.type)
      .order("created_at", { ascending: false })
      .limit(1);
  }

  console.log(`[Notify] ${payload.type}: "${payload.title}" → [${channels.join(", ")}]`);
}

/**
 * Get unread notifications for a business (dashboard bell icon)
 */
export async function getUnreadNotifications(
  businessId: string,
  limit: number = 20
): Promise<Array<Record<string, unknown>>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data || [];
}

/**
 * Mark notifications as read
 */
export async function markNotificationsRead(
  businessId: string,
  notificationIds?: string[]
): Promise<void> {
  const supabase = createAdminClient();
  if (notificationIds && notificationIds.length > 0) {
    await supabase.from("notifications")
      .update({ is_read: true })
      .eq("business_id", businessId)
      .in("id", notificationIds);
  } else {
    // Mark all as read
    await supabase.from("notifications")
      .update({ is_read: true })
      .eq("business_id", businessId)
      .eq("is_read", false);
  }
}

// ─── Message Formatter ──────────────────────────────────────────────────────

function formatNotificationMessage(payload: NotificationPayload, businessName: string): string {
  const emoji: Record<string, string> = {
    new_lead: "🆕",
    hot_lead: "🔥",
    qualified: "✅",
    site_visit: "📅",
    booking: "🎉",
    cancellation: "❌",
    reassigned: "🔄",
  };

  const icon = emoji[payload.type] || "📢";
  const meta = payload.metadata || {};
  let msg = `${icon} *${payload.title}*`;

  if (payload.body) msg += `\n${payload.body}`;

  if (meta.phone) msg += `\n📞 ${meta.phone}`;
  if (meta.source) msg += `\n📍 Source: ${meta.source}`;

  msg += `\n\n— ${businessName} CRM`;

  return msg;
}
