import { createAdminClient } from "@/lib/supabase/admin";
import { emitBatchEvents } from "./event-emitter";
import type {
  AppointmentReminderEvent,
  MissedCustomerEvent,
  PaymentReminderEvent,
  TrialExpiringEvent,
} from "./types";

/**
 * Automation Scheduler
 *
 * Scans the database for events that need to trigger automations.
 * Called by cron jobs (every hour for most, every 15 min for reminders).
 *
 * Each function:
 * 1. Queries the database for eligible records
 * 2. Builds event payloads
 * 3. Sends to n8n via webhook
 * 4. Marks records as processed (prevents duplicate sends)
 */

// ─── 1. Appointment Reminders ───────────────────────────────────────────────

/**
 * Find appointments that need reminders and send them.
 * Runs every 15 minutes.
 *
 * Reminder schedule:
 * - 24 hours before: "Your appointment is tomorrow at X"
 * - 1 hour before: "Reminder: your appointment is in 1 hour"
 */
export async function processAppointmentReminders(): Promise<{ sent: number; skipped: number }> {
  const supabase = createAdminClient();
  const now = new Date();
  const events: AppointmentReminderEvent[] = [];

  // 24-hour reminders: appointments between 23-25 hours from now
  const reminder24hStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const reminder24hEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: appointments24h } = await supabase
    .from("appointments")
    .select(`
      id, title, service, scheduled_at, duration_minutes,
      reminder_sent,
      leads!inner (id, name, phone, wa_id),
      businesses!inner (id, name, whatsapp_phone_number_id, whatsapp_access_token, is_active)
    `)
    .in("status", ["confirmed", "pending"])
    .eq("reminder_sent", false)
    .gte("scheduled_at", reminder24hStart.toISOString())
    .lte("scheduled_at", reminder24hEnd.toISOString());

  if (appointments24h) {
    for (const apt of appointments24h) {
      const lead = apt.leads as unknown as { id: string; name: string | null; phone: string; wa_id: string };
      const biz = apt.businesses as unknown as { id: string; name: string; whatsapp_phone_number_id: string; whatsapp_access_token: string; is_active: boolean };

      if (!biz.is_active || !biz.whatsapp_phone_number_id) continue;

      events.push({
        type: "appointment_reminder",
        timestamp: now.toISOString(),
        business_id: biz.id,
        appointment: {
          id: apt.id,
          title: apt.title,
          service: apt.service || "",
          scheduled_at: apt.scheduled_at,
          duration_minutes: apt.duration_minutes,
        },
        lead: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          wa_id: lead.wa_id,
        },
        business: {
          name: biz.name,
          phone_number_id: biz.whatsapp_phone_number_id,
          access_token: biz.whatsapp_access_token,
        },
        reminder_type: "24h",
      });

      // Mark as sent
      await supabase
        .from("appointments")
        .update({ reminder_sent: true, reminder_sent_at: now.toISOString() })
        .eq("id", apt.id);
    }
  }

  // 1-hour reminders: appointments between 45-75 minutes from now
  const reminder1hStart = new Date(now.getTime() + 45 * 60 * 1000);
  const reminder1hEnd = new Date(now.getTime() + 75 * 60 * 1000);

  const { data: appointments1h } = await supabase
    .from("appointments")
    .select(`
      id, title, service, scheduled_at, duration_minutes,
      leads!inner (id, name, phone, wa_id),
      businesses!inner (id, name, whatsapp_phone_number_id, whatsapp_access_token, is_active)
    `)
    .in("status", ["confirmed", "pending"])
    .eq("reminder_sent", true) // 24h reminder already sent
    .gte("scheduled_at", reminder1hStart.toISOString())
    .lte("scheduled_at", reminder1hEnd.toISOString());

  if (appointments1h) {
    for (const apt of appointments1h) {
      const lead = apt.leads as unknown as { id: string; name: string | null; phone: string; wa_id: string };
      const biz = apt.businesses as unknown as { id: string; name: string; whatsapp_phone_number_id: string; whatsapp_access_token: string; is_active: boolean };

      if (!biz.is_active || !biz.whatsapp_phone_number_id) continue;

      events.push({
        type: "appointment_reminder",
        timestamp: now.toISOString(),
        business_id: biz.id,
        appointment: {
          id: apt.id,
          title: apt.title,
          service: apt.service || "",
          scheduled_at: apt.scheduled_at,
          duration_minutes: apt.duration_minutes,
        },
        lead: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          wa_id: lead.wa_id,
        },
        business: {
          name: biz.name,
          phone_number_id: biz.whatsapp_phone_number_id,
          access_token: biz.whatsapp_access_token,
        },
        reminder_type: "1h",
      });
    }
  }

  const result = await emitBatchEvents(events);
  return { sent: result.sent, skipped: result.failed };
}

// ─── 2. Missed Customer Reactivation ────────────────────────────────────────

/**
 * Find customers who haven't messaged in 7+ days and trigger reactivation.
 * Runs daily.
 */
export async function processMissedCustomers(): Promise<{ sent: number; skipped: number }> {
  const supabase = createAdminClient();
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Find leads inactive for 7-30 days who were previously engaged
  const { data: inactiveLeads } = await supabase
    .from("leads")
    .select(`
      id, name, phone, wa_id, last_message_at, metadata, message_count,
      businesses!inner (id, name, whatsapp_phone_number_id, whatsapp_access_token, is_active, ai_enabled)
    `)
    .in("status", ["contacted", "qualified"])
    .lt("last_message_at", sevenDaysAgo.toISOString())
    .gt("last_message_at", thirtyDaysAgo.toISOString())
    .gt("message_count", 2) // Had at least a real conversation
    .limit(100);

  if (!inactiveLeads || inactiveLeads.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  const events: MissedCustomerEvent[] = [];

  for (const lead of inactiveLeads) {
    const biz = lead.businesses as unknown as {
      id: string; name: string;
      whatsapp_phone_number_id: string; whatsapp_access_token: string;
      is_active: boolean; ai_enabled: boolean;
    };

    if (!biz.is_active || !biz.ai_enabled || !biz.whatsapp_phone_number_id) continue;

    // Check if we already sent a reactivation recently
    const metadata = (lead.metadata || {}) as Record<string, unknown>;
    const lastReactivation = metadata.last_reactivation_at as string | undefined;
    if (lastReactivation) {
      const lastSent = new Date(lastReactivation);
      if (now.getTime() - lastSent.getTime() < 14 * 24 * 60 * 60 * 1000) {
        continue; // Don't reactivate more than once per 14 days
      }
    }

    const daysInactive = Math.floor(
      (now.getTime() - new Date(lead.last_message_at).getTime()) / (24 * 60 * 60 * 1000)
    );

    events.push({
      type: "missed_customer",
      timestamp: now.toISOString(),
      business_id: biz.id,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        wa_id: lead.wa_id,
        last_message_at: lead.last_message_at,
        days_inactive: daysInactive,
        previous_interest: (metadata.preferred_service as string) || null,
      },
      business: {
        name: biz.name,
        phone_number_id: biz.whatsapp_phone_number_id,
        access_token: biz.whatsapp_access_token,
      },
    });

    // Mark as reactivation sent
    await supabase
      .from("leads")
      .update({
        metadata: { ...metadata, last_reactivation_at: now.toISOString() },
      })
      .eq("id", lead.id);
  }

  const result = await emitBatchEvents(events);
  return { sent: result.sent, skipped: result.failed };
}

// ─── 3. Payment Reminders ───────────────────────────────────────────────────

/**
 * Find subscriptions expiring soon and notify business owners.
 * Runs daily.
 */
export async function processPaymentReminders(): Promise<{ sent: number; skipped: number }> {
  const supabase = createAdminClient();
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Find subscriptions expiring in the next 3 days
  const { data: expiring } = await supabase
    .from("subscriptions")
    .select(`
      id, plan, status, current_period_end,
      businesses!inner (id, name, email, phone, owner_id)
    `)
    .eq("status", "active")
    .lte("current_period_end", threeDaysFromNow.toISOString())
    .gt("current_period_end", now.toISOString());

  if (!expiring || expiring.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  const events: PaymentReminderEvent[] = [];

  for (const sub of expiring) {
    const biz = sub.businesses as unknown as {
      id: string; name: string; email: string; phone: string | null;
    };

    const daysUntilExpiry = Math.ceil(
      (new Date(sub.current_period_end).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    events.push({
      type: "payment_reminder",
      timestamp: now.toISOString(),
      business_id: biz.id,
      subscription: {
        id: sub.id,
        plan: sub.plan,
        status: sub.status,
        current_period_end: sub.current_period_end,
        days_until_expiry: daysUntilExpiry,
      },
      business: {
        name: biz.name,
        owner_email: biz.email,
        owner_phone: biz.phone,
      },
    });
  }

  const result = await emitBatchEvents(events);
  return { sent: result.sent, skipped: result.failed };
}

// ─── 4. Trial Conversion ────────────────────────────────────────────────────

/**
 * Find trial subscriptions expiring in 2-3 days and nudge conversion.
 * Runs daily.
 */
export async function processTrialConversions(): Promise<{ sent: number; skipped: number }> {
  const supabase = createAdminClient();
  const now = new Date();
  const twoDaysFromNow = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const { data: trials } = await supabase
    .from("subscriptions")
    .select(`
      id, trial_end, messages_used, message_limit,
      businesses!inner (id, name, email, phone)
    `)
    .eq("status", "trialing")
    .gte("trial_end", twoDaysFromNow.toISOString())
    .lte("trial_end", threeDaysFromNow.toISOString());

  if (!trials || trials.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  const events: TrialExpiringEvent[] = [];

  for (const trial of trials) {
    const biz = trial.businesses as unknown as {
      id: string; name: string; email: string; phone: string | null;
    };

    const daysRemaining = Math.ceil(
      (new Date(trial.trial_end).getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
    );

    events.push({
      type: "trial_expiring",
      timestamp: now.toISOString(),
      business_id: biz.id,
      subscription: {
        id: trial.id,
        trial_end: trial.trial_end,
        days_remaining: daysRemaining,
        messages_used: trial.messages_used,
        message_limit: trial.message_limit,
      },
      business: {
        name: biz.name,
        owner_email: biz.email,
        owner_phone: biz.phone,
      },
    });
  }

  const result = await emitBatchEvents(events);
  return { sent: result.sent, skipped: result.failed };
}
