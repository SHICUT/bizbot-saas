/**
 * Site Visit Automation Engine
 *
 * Handles the complete post-booking lifecycle:
 * 1. Reminder messages (24h + 2h before visit)
 * 2. Post-visit follow-up (ask how it went)
 * 3. Feedback collection (6h after visit)
 * 4. Re-engagement if no booking happens (48h after visit)
 *
 * Called by cron job: /api/cron/reminders
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "@/lib/whatsapp/client";

interface ReminderResult {
  sent: number;
  errors: number;
}

/**
 * Process all pending appointment reminders.
 * Sends 24h and 2h WhatsApp reminder messages.
 */
export async function processAppointmentReminders(): Promise<ReminderResult> {
  const supabase = createAdminClient();
  const result: ReminderResult = { sent: 0, errors: 0 };
  const now = new Date();

  // Find reminders that are due and not yet sent
  const { data: reminders } = await supabase
    .from("appointment_reminders")
    .select(`
      id, appointment_id, reminder_type, scheduled_for,
      appointments!inner (
        id, customer_name, customer_phone, service, appointment_date, appointment_time,
        status, business_id,
        businesses!inner (
          name, address, city, whatsapp_phone_number_id, whatsapp_access_token, google_maps_link
        )
      )
    `)
    .eq("sent", false)
    .lte("scheduled_for", now.toISOString())
    .in("appointments.status", ["confirmed", "pending"])
    .limit(50);

  if (!reminders || reminders.length === 0) return result;

  for (const reminder of reminders) {
    const apt = reminder.appointments as unknown as {
      customer_name: string; customer_phone: string; service: string;
      appointment_date: string; appointment_time: string; business_id: string;
      businesses: { name: string; address: string; city: string; whatsapp_phone_number_id: string; whatsapp_access_token: string; google_maps_link: string };
    };

    if (!apt?.customer_phone || !apt.businesses?.whatsapp_phone_number_id) continue;

    try {
      const client = new WhatsAppClient({
        phone_number_id: apt.businesses.whatsapp_phone_number_id,
        access_token: apt.businesses.whatsapp_access_token,
        business_id: apt.business_id,
      });

      const message = buildReminderMessage(
        reminder.reminder_type,
        apt.customer_name,
        apt.service,
        apt.appointment_date,
        apt.appointment_time,
        apt.businesses.name,
        [apt.businesses.address, apt.businesses.city].filter(Boolean).join(", "),
        apt.businesses.google_maps_link
      );

      await client.sendTextMessage(apt.customer_phone, message);

      // Mark as sent
      await supabase.from("appointment_reminders")
        .update({ sent: true, sent_at: now.toISOString() })
        .eq("id", reminder.id);

      result.sent++;
    } catch (e) {
      console.error(`[Reminder] Failed for ${reminder.id}:`, e);
      result.errors++;
    }
  }

  return result;
}

/**
 * Process post-visit follow-ups.
 * Sends feedback request 6 hours after appointment time.
 */
export async function processPostVisitFollowUps(): Promise<ReminderResult> {
  const supabase = createAdminClient();
  const result: ReminderResult = { sent: 0, errors: 0 };
  const now = new Date();

  // Find completed visits from 6-48 hours ago without feedback sent
  const sixHoursAgo = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString().split("T")[0];
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];

  const { data: completedVisits } = await supabase
    .from("appointments")
    .select(`
      id, customer_name, customer_phone, service, appointment_date, business_id, lead_id, metadata,
      businesses!inner (name, whatsapp_phone_number_id, whatsapp_access_token)
    `)
    .eq("status", "completed")
    .gte("appointment_date", twoDaysAgo)
    .lte("appointment_date", sixHoursAgo)
    .limit(30);

  if (!completedVisits) return result;

  for (const visit of completedVisits) {
    const meta = (visit.metadata || {}) as Record<string, unknown>;
    if (meta.feedback_sent) continue; // Already sent

    const biz = visit.businesses as unknown as { name: string; whatsapp_phone_number_id: string; whatsapp_access_token: string };
    if (!visit.customer_phone || !biz?.whatsapp_phone_number_id) continue;

    try {
      const client = new WhatsAppClient({
        phone_number_id: biz.whatsapp_phone_number_id,
        access_token: biz.whatsapp_access_token,
        business_id: visit.business_id,
      });

      const message = buildPostVisitMessage(visit.customer_name, visit.service, biz.name);
      await client.sendTextMessage(visit.customer_phone, message);

      // Mark feedback sent
      await supabase.from("appointments")
        .update({ metadata: { ...meta, feedback_sent: true, feedback_sent_at: now.toISOString() } })
        .eq("id", visit.id);

      result.sent++;
    } catch (e) {
      console.error(`[PostVisit] Failed for ${visit.id}:`, e);
      result.errors++;
    }
  }

  return result;
}

/**
 * Re-engage leads who visited but haven't booked (48h+ after visit).
 */
export async function processReEngagement(): Promise<ReminderResult> {
  const supabase = createAdminClient();
  const result: ReminderResult = { sent: 0, errors: 0 };
  const now = new Date();
  const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString().split("T")[0];
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // Find completed visits where lead hasn't converted
  const { data: visits } = await supabase
    .from("appointments")
    .select(`
      id, customer_name, customer_phone, service, business_id, lead_id, metadata,
      businesses!inner (name, whatsapp_phone_number_id, whatsapp_access_token),
      leads!inner (status)
    `)
    .eq("status", "completed")
    .gte("appointment_date", fiveDaysAgo)
    .lte("appointment_date", twoDaysAgo)
    .in("leads.status", ["qualified", "new", "contacted"])
    .limit(20);

  if (!visits) return result;

  for (const visit of visits) {
    const meta = (visit.metadata || {}) as Record<string, unknown>;
    if (meta.reengagement_sent) continue;

    const biz = visit.businesses as unknown as { name: string; whatsapp_phone_number_id: string; whatsapp_access_token: string };
    if (!visit.customer_phone || !biz?.whatsapp_phone_number_id) continue;

    try {
      const client = new WhatsAppClient({
        phone_number_id: biz.whatsapp_phone_number_id,
        access_token: biz.whatsapp_access_token,
        business_id: visit.business_id,
      });

      const message = buildReEngagementMessage(visit.customer_name, visit.service, biz.name);
      await client.sendTextMessage(visit.customer_phone, message);

      await supabase.from("appointments")
        .update({ metadata: { ...meta, reengagement_sent: true } })
        .eq("id", visit.id);

      result.sent++;
    } catch {
      result.errors++;
    }
  }

  return result;
}

// ─── Message Builders ────────────────────────────────────────────────────────

function buildReminderMessage(
  type: string, name: string, service: string, date: string, time: string,
  businessName: string, address: string, mapsLink?: string
): string {
  const displayDate = new Date(date + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  const displayTime = formatTime(time);
  const greeting = name ? `Hi ${name}!` : "Hi!";

  if (type === "24h") {
    let msg = `${greeting} 📅\n\nReminder: Your ${service} is tomorrow.\n\n`;
    msg += `📅 ${displayDate}\n⏰ ${displayTime}\n🏢 ${businessName}`;
    if (address) msg += `\n📍 ${address}`;
    if (mapsLink) msg += `\n🗺️ ${mapsLink}`;
    msg += `\n\nSee you there! Reply if you need to reschedule.`;
    return msg;
  }

  // 2h reminder
  let msg = `${greeting} ⏰\n\nYour ${service} is in 2 hours!\n\n`;
  msg += `⏰ ${displayTime} today\n🏢 ${businessName}`;
  if (address) msg += `\n📍 ${address}`;
  if (mapsLink) msg += `\n🗺️ Navigate: ${mapsLink}`;
  msg += `\n\nWe're looking forward to meeting you! 🙏`;
  return msg;
}

function buildPostVisitMessage(name: string, service: string, businessName: string): string {
  const greeting = name ? `Hi ${name}!` : "Hi!";
  return `${greeting} 🙏\n\nThank you for visiting ${businessName} today!\n\nHow was your experience? Did the ${service} meet your expectations?\n\nIf you have any questions or would like to proceed further, just reply here. I'm happy to help!\n\n— ${businessName}`;
}

function buildReEngagementMessage(name: string, service: string, businessName: string): string {
  const greeting = name ? `Hi ${name}!` : "Hi!";
  return `${greeting} 👋\n\nHope you're doing well! Following up after your recent visit to ${businessName}.\n\nHave you had a chance to think about it? I can help with:\n• Payment plan options\n• Any questions about the property\n• Another visit if needed\n\nNo pressure — just want to make sure you have everything you need! 🏠`;
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}
