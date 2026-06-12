/**
 * Appointment Detector
 *
 * After the AI generates a reply confirming an appointment,
 * this module detects the confirmation and creates the database record.
 *
 * The AI often says things like:
 * - "Done! Your appointment is booked for tomorrow at 3 PM"
 * - "Great, I've scheduled your session for Monday 10 AM"
 * - "Your free trial is confirmed for 6 PM today"
 *
 * This module parses such replies and creates the appointment in the DB.
 */

import { createAdminClient } from "@/lib/supabase/admin";

interface DetectedAppointment {
  date: string;       // YYYY-MM-DD
  time: string;       // HH:MM
  service: string;
  title: string;
}

/**
 * Check if an AI reply confirms an appointment booking.
 * If yes, extract details and create the appointment record.
 *
 * Returns true if an appointment was created.
 */
export async function detectAndCreateAppointment(
  aiReply: string,
  incomingMessage: string,
  businessId: string,
  leadId: string,
  leadName: string | null,
  leadPhone: string
): Promise<boolean> {
  // Check if the AI reply indicates a confirmed booking
  if (!isBookingConfirmation(aiReply)) {
    return false;
  }

  // Extract appointment details from the reply + incoming message
  const details = extractAppointmentDetails(aiReply, incomingMessage);
  if (!details) {
    console.warn("[AppointmentDetector] Detected booking language but couldn't extract date/time");
    return false;
  }

  // Create appointment in database
  const supabase = createAdminClient();
  const scheduledAt = `${details.date}T${details.time}:00`;

  const { error } = await supabase.from("appointments").insert({
    business_id: businessId,
    lead_id: leadId,
    customer_name: leadName || "Customer",
    customer_phone: leadPhone || null,
    title: details.title,
    service: details.service,
    appointment_date: details.date,
    appointment_time: details.time,
    scheduled_at: scheduledAt,
    duration_minutes: 60,
    status: "confirmed",
    source: "whatsapp",
    booked_by: "ai",
    booked_via: "whatsapp",
  });

  if (error) {
    console.error("[AppointmentDetector] Failed to create appointment:", error.message);
    return false;
  }

  // Update lead status
  await supabase.from("leads").update({ status: "qualified" }).eq("id", leadId);

  console.log(`[AppointmentDetector] ✓ Appointment created: ${details.title} on ${details.date} at ${details.time} for lead ${leadId.substring(0, 8)}`);
  return true;
}

/**
 * Detects if an AI reply is confirming a booking/appointment.
 */
function isBookingConfirmation(reply: string): boolean {
  const lower = reply.toLowerCase();

  const confirmationPatterns = [
    /\b(booked|confirmed|scheduled|reserved)\b/,
    /appointment\s+(is|has been)\s+(booked|confirmed|scheduled)/,
    /i['']?ve?\s+(booked|scheduled|reserved|confirmed)/,
    /your\s+(appointment|session|slot|booking|trial|visit|consultation)\s+(is|has been)/,
    /done[.!]?\s*(your|i['']?ve)/i,
    /all\s+set/i,
    /you['']?re\s+(booked|all set|confirmed)/,
    /slot\s+(booked|confirmed|reserved)/,
    /see\s+you\s+(on|at|tomorrow)/,
  ];

  return confirmationPatterns.some((p) => p.test(lower));
}

/**
 * Extracts date, time, and service from the AI reply and customer message.
 */
function extractAppointmentDetails(aiReply: string, customerMessage: string): DetectedAppointment | null {
  const combined = `${customerMessage} ${aiReply}`;
  const now = new Date();

  let date: string | null = null;
  let time: string | null = null;

  // ─── Extract Time ───
  // "3 PM", "3:00 PM", "15:00", "10 AM", "6 pm"
  const timePatterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,
    /(\d{1,2})\s*(am|pm)/i,
    /(\d{1,2}):(\d{2})/,
  ];

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

  // ─── Extract Date ───
  // "tomorrow", "Monday", "June 15", "15/06", "2024-06-15"
  const lower = combined.toLowerCase();

  if (/\btomorrow\b/.test(lower) || /\bkal\b/.test(lower)) {
    const tomorrow = new Date(now.getTime() + 86400000);
    date = formatDate(tomorrow);
  } else if (/\btoday\b/.test(lower) || /\baaj\b/.test(lower)) {
    date = formatDate(now);
  } else if (/\bday after tomorrow\b/.test(lower) || /\bparson\b/.test(lower)) {
    const dayAfter = new Date(now.getTime() + 2 * 86400000);
    date = formatDate(dayAfter);
  } else {
    // Try named days: "Monday", "Tuesday", etc.
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    for (let i = 0; i < days.length; i++) {
      if (lower.includes(days[i])) {
        const today = now.getDay();
        let diff = i - today;
        if (diff <= 0) diff += 7;
        const targetDate = new Date(now.getTime() + diff * 86400000);
        date = formatDate(targetDate);
        break;
      }
    }
  }

  // Try explicit date patterns: "June 15", "15 June", "15/06"
  if (!date) {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const monthMatch = combined.match(/(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*/i) ||
                       combined.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})/i);
    if (monthMatch) {
      const dayStr = monthMatch[1].match(/\d/) ? monthMatch[1] : monthMatch[2];
      const monStr = monthMatch[1].match(/\d/) ? monthMatch[2] : monthMatch[1];
      const monthIdx = months.findIndex((m) => monStr.toLowerCase().startsWith(m));
      if (monthIdx >= 0) {
        const year = now.getFullYear();
        const d = new Date(year, monthIdx, parseInt(dayStr));
        if (d < now) d.setFullYear(year + 1);
        date = formatDate(d);
      }
    }
  }

  // If no date found but time was found, default to tomorrow
  if (!date && time) {
    const tomorrow = new Date(now.getTime() + 86400000);
    date = formatDate(tomorrow);
  }

  if (!date || !time) return null;

  // Extract service name from context
  const service = extractService(combined);
  const title = service || "Appointment";

  return { date, time, service: service || "General", title };
}

function extractService(text: string): string {
  const servicePatterns = [
    /\b(free trial|trial session|demo|consultation|checkup|check-up|haircut|facial|massage|training|class|session|visit|meeting)\b/i,
    /\b(appointment for|booking for|session of|slot for)\s+(.+?)[\.,!?]?$/im,
  ];

  for (const p of servicePatterns) {
    const match = text.match(p);
    if (match) {
      return (match[2] || match[1]).trim();
    }
  }
  return "";
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
