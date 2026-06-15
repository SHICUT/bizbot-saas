/**
 * Appointment Detector & Confirmation System
 *
 * After the AI generates a reply confirming an appointment:
 * 1. Detects booking confirmation language in AI reply
 * 2. Extracts date, time, and service from conversation
 * 3. Creates appointment record in database
 * 4. Sends formatted WhatsApp confirmation message
 * 5. Schedules reminders (24h + 2h before)
 * 6. Handles rescheduling requests
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "@/lib/whatsapp/client";
import { getIndustryConfig } from "./industry-config";

interface DetectedAppointment {
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  service: string;
  title: string;
}

interface AppointmentContext {
  businessId: string;
  businessName: string;
  businessType: string;
  businessAddress?: string;
  phoneNumberId: string;
  accessToken: string;
}

/**
 * Detect appointment confirmation in AI reply, create record, send confirmation.
 */
export async function detectAndCreateAppointment(
  aiReply: string,
  incomingMessage: string,
  businessId: string,
  leadId: string,
  leadName: string | null,
  leadPhone: string,
  businessType?: string
): Promise<boolean> {
  // Step 1: Check for booking confirmation language
  const isConfirmation = isBookingConfirmation(aiReply);
  if (!isConfirmation) return false;

  console.log(`[Appt] Booking detected in reply: "${aiReply.substring(0, 60)}..."`);

  // Step 2: Extract date and time
  const details = extractAppointmentDetails(aiReply, incomingMessage);
  if (!details) {
    console.warn(`[Appt] ⚠ Could not extract date/time from: "${incomingMessage.substring(0, 60)}"`);
    return false;
  }

  console.log(`[Appt] Extracted: ${details.date} at ${details.time} | Service: ${details.service}`);

  // Step 3: Get business info for confirmation message
  const supabase = createAdminClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("name, address, city, whatsapp_phone_number_id, whatsapp_access_token")
    .eq("id", businessId)
    .single();

  if (!business) { console.error("[Appt] Business not found"); return false; }

  // Step 4: Industry-specific config
  const config = businessType ? getIndustryConfig(businessType) : null;
  const service = details.service || config?.appointmentTypes[0]?.label || "Appointment";
  const duration = config?.appointmentTypes.find((a) =>
    service.toLowerCase().includes(a.label.toLowerCase()) || a.label.toLowerCase().includes(service.toLowerCase())
  )?.defaultDuration || 60;

  // Step 5: Create appointment record
  const scheduledAt = `${details.date}T${details.time}:00`;
  const { data: appointment, error } = await supabase.from("appointments").insert({
    business_id: businessId,
    lead_id: leadId,
    customer_name: leadName || "Customer",
    customer_phone: leadPhone || null,
    title: details.title || service,
    service,
    appointment_date: details.date,
    appointment_time: details.time,
    scheduled_at: scheduledAt,
    duration_minutes: duration,
    status: "confirmed",
    source: "whatsapp",
    booked_by: "ai",
    booked_via: "whatsapp",
  }).select("id").single();

  if (error) {
    console.error(`[Appt] ❌ INSERT FAILED: ${error.message}`);
    return false;
  }

  // Step 6: Update lead status
  await supabase.from("leads").update({ status: "qualified" }).eq("id", leadId);

  console.log(`[Appt] ✓ Created: ${appointment.id} | ${service} on ${details.date} at ${details.time}`);

  // Step 7: Send formatted confirmation message
  if (business.whatsapp_phone_number_id && business.whatsapp_access_token) {
    try {
      const confirmationMsg = buildConfirmationMessage({
        date: details.date,
        time: details.time,
        service,
        businessName: business.name,
        location: [business.address, business.city].filter(Boolean).join(", ") || undefined,
        customerName: leadName,
        businessType: businessType || "other",
      });

      const client = new WhatsAppClient({
        phone_number_id: business.whatsapp_phone_number_id,
        access_token: business.whatsapp_access_token,
        business_id: businessId,
      });

      const sendResult = await client.sendTextMessage(leadPhone, confirmationMsg);
      const confirmMsgId = sendResult.messages?.[0]?.id;

      // Store confirmation message
      if (confirmMsgId) {
        const { data: conv } = await supabase.from("conversations")
          .select("id").eq("business_id", businessId).eq("lead_id", leadId).limit(1).single();

        if (conv) {
          await supabase.from("messages").insert({
            business_id: businessId,
            conversation_id: conv.id,
            lead_id: leadId,
            wa_message_id: confirmMsgId,
            direction: "outbound",
            content: confirmationMsg,
            message_type: "text",
            is_ai_generated: true,
            status: "sent",
          });
        }
      }

      console.log(`[Appt] ✓ Confirmation sent: ${confirmMsgId}`);
    } catch (e) {
      console.warn("[Appt] Confirmation message failed (non-critical):", e);
    }
  }

  // Step 8: Schedule reminders
  try {
    const scheduledDate = new Date(scheduledAt);
    const reminder24h = new Date(scheduledDate.getTime() - 24 * 60 * 60 * 1000);
    const reminder2h = new Date(scheduledDate.getTime() - 2 * 60 * 60 * 1000);
    const now = new Date();

    const reminders = [];
    if (reminder24h > now) {
      reminders.push({ business_id: businessId, appointment_id: appointment.id, reminder_type: "24h", scheduled_for: reminder24h.toISOString(), sent: false });
    }
    if (reminder2h > now) {
      reminders.push({ business_id: businessId, appointment_id: appointment.id, reminder_type: "2h", scheduled_for: reminder2h.toISOString(), sent: false });
    }

    if (reminders.length > 0) {
      await supabase.from("appointment_reminders").insert(reminders);
      console.log(`[Appt] ✓ ${reminders.length} reminder(s) scheduled`);
    }
  } catch { /* non-critical */ }

  // Step 9: Create timeline event
  await supabase.from("lead_timeline").insert({
    business_id: businessId,
    lead_id: leadId,
    event_type: "appointment_booked",
    description: `${service} booked for ${formatDisplayDate(details.date)} at ${formatDisplayTime(details.time)}`,
    metadata: { appointment_id: appointment.id, service, date: details.date, time: details.time },
  }).then(() => {}, () => {});

  return true;
}

/**
 * Detect rescheduling intent and update existing appointment.
 */
export async function detectReschedule(
  aiReply: string,
  incomingMessage: string,
  businessId: string,
  leadId: string
): Promise<boolean> {
  const lower = incomingMessage.toLowerCase();
  const reschedulePatterns = [
    /\b(reschedule|move|change|shift|postpone|prepone)\b.*\b(appointment|booking|visit|session)\b/i,
    /\b(can we|can i|please)\s+(move|change|shift|reschedule)\b/i,
    /\b(different|another|new)\s+(time|date|day|slot)\b/i,
  ];

  if (!reschedulePatterns.some((p) => p.test(lower))) return false;

  // Check AI reply confirms the reschedule
  if (!isBookingConfirmation(aiReply)) return false;

  const details = extractAppointmentDetails(aiReply, incomingMessage);
  if (!details) return false;

  const supabase = createAdminClient();
  // Find the most recent confirmed appointment for this lead
  const { data: existingApt } = await supabase.from("appointments")
    .select("id")
    .eq("business_id", businessId)
    .eq("lead_id", leadId)
    .in("status", ["confirmed", "pending"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!existingApt) return false;

  // Update the appointment
  await supabase.from("appointments").update({
    appointment_date: details.date,
    appointment_time: details.time,
    scheduled_at: `${details.date}T${details.time}:00`,
    status: "confirmed",
  }).eq("id", existingApt.id);

  console.log(`[Appt] ✓ RESCHEDULED: ${existingApt.id} → ${details.date} at ${details.time}`);
  return true;
}

// ─── Confirmation Message Builder ────────────────────────────────────────────

function buildConfirmationMessage(opts: {
  date: string;
  time: string;
  service: string;
  businessName: string;
  location?: string;
  customerName: string | null;
  businessType: string;
}): string {
  const displayDate = formatDisplayDate(opts.date);
  const displayTime = formatDisplayTime(opts.time);
  const greeting = opts.customerName ? `Hi ${opts.customerName}! ` : "";

  let purposeLabel = "📝 Purpose";
  if (opts.businessType === "real_estate") purposeLabel = "🏠 Purpose";
  else if (opts.businessType === "clinic" || opts.businessType === "dental") purposeLabel = "🏥 Purpose";
  else if (opts.businessType === "salon") purposeLabel = "💇 Service";
  else if (opts.businessType === "gym") purposeLabel = "💪 Session";
  else if (opts.businessType === "restaurant") purposeLabel = "🍽️ Reservation";

  let msg = `${greeting}✅ *Your appointment has been confirmed!*\n\n`;
  msg += `📅 *Date:* ${displayDate}\n`;
  msg += `⏰ *Time:* ${displayTime}\n`;
  msg += `🏢 *Business:* ${opts.businessName}\n`;
  if (opts.location) msg += `📍 *Location:* ${opts.location}\n`;
  msg += `${purposeLabel}: ${opts.service}\n`;
  msg += `\n_If you need to reschedule or cancel, simply reply to this message._\n`;
  msg += `\nThank you! — ${opts.businessName}`;

  return msg;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

function formatDisplayTime(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${hour}:${String(m).padStart(2, "0")} ${ampm}`;
}

// ─── Detection Logic ─────────────────────────────────────────────────────────

function isBookingConfirmation(reply: string): boolean {
  const lower = reply.toLowerCase();
  const patterns = [
    /\b(booked|confirmed|scheduled|reserved)\b/,
    /appointment\s+(is|has been)\s+(booked|confirmed|scheduled)/,
    /i['']?ve?\s+(booked|scheduled|reserved|confirmed)/,
    /your\s+(appointment|session|slot|booking|trial|visit|consultation)\s+(is|has been)/,
    /done[.!]?\s*(your|i['']?ve)/i,
    /all\s+set/i,
    /you['']?re\s+(booked|all set|confirmed)/,
    /see\s+you\s+(on|at|tomorrow)/,
  ];
  return patterns.some((p) => p.test(lower));
}

function extractAppointmentDetails(aiReply: string, customerMessage: string): DetectedAppointment | null {
  const combined = `${customerMessage} ${aiReply}`;
  const now = new Date();
  let date: string | null = null;
  let time: string | null = null;

  // Extract Time
  const timePatterns = [/(\d{1,2}):(\d{2})\s*(am|pm)/i, /(\d{1,2})\s*(am|pm)/i, /(\d{1,2}):(\d{2})/];
  for (const pattern of timePatterns) {
    const match = combined.match(pattern);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = match[2] && !match[2].match(/am|pm/i) ? parseInt(match[2]) : 0;
      const ampm = (match[3] || match[2] || "").toLowerCase();
      if (ampm === "pm" && hours < 12) hours += 12;
      if (ampm === "am" && hours === 12) hours = 0;
      time = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      break;
    }
  }

  // Extract Date
  const lower = combined.toLowerCase();
  if (/\btomorrow\b/.test(lower) || /\bkal\b/.test(lower)) {
    date = fmtDate(new Date(now.getTime() + 86400000));
  } else if (/\btoday\b/.test(lower) || /\baaj\b/.test(lower)) {
    date = fmtDate(now);
  } else if (/\bday after tomorrow\b/.test(lower) || /\bparson\b/.test(lower)) {
    date = fmtDate(new Date(now.getTime() + 2 * 86400000));
  } else {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        let diff = i - now.getDay();
        if (diff <= 0) diff += 7;
        date = fmtDate(new Date(now.getTime() + diff * 86400000));
        break;
      }
    }
  }

  if (!date) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthMatch = combined.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/i) ||
                       combined.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})/i);
    if (monthMatch) {
      const dayStr = monthMatch[1].match(/\d/) ? monthMatch[1] : monthMatch[2];
      const monStr = monthMatch[1].match(/\d/) ? monthMatch[2] : monthMatch[1];
      const monthIdx = months.findIndex((m) => monStr.toLowerCase().startsWith(m));
      if (monthIdx >= 0) {
        const d = new Date(now.getFullYear(), monthIdx, parseInt(dayStr));
        if (d < now) d.setFullYear(now.getFullYear() + 1);
        date = fmtDate(d);
      }
    }
  }

  if (!date && time) date = fmtDate(new Date(now.getTime() + 86400000));
  if (!date || !time) return null;

  const service = extractService(combined);
  return { date, time, service: service || "General", title: service || "Appointment" };
}

function extractService(text: string): string {
  const patterns = [
    /\b(free trial|trial session|demo|consultation|checkup|check-up|haircut|facial|massage|training|class|session|visit|meeting|site visit|test drive)\b/i,
    /\b(appointment for|booking for|session of|slot for)\s+(.+?)[\.,!?]?$/im,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) return (match[2] || match[1]).trim();
  }
  return "";
}

function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
