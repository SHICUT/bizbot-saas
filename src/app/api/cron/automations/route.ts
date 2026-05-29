import { NextRequest, NextResponse } from "next/server";
import {
  processAppointmentReminders,
  processMissedCustomers,
  processPaymentReminders,
  processTrialConversions,
} from "@/lib/automations/scheduler";
import { processFollowUps } from "@/lib/ai/follow-up";

/**
 * GET /api/cron/automations
 *
 * Master cron endpoint — runs ALL automations in a single daily call.
 * Schedule: 0 0 * * * (once per day at midnight UTC / 5:30 AM IST)
 * Compatible with Vercel Hobby plan.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, { sent: number; skipped: number } | { error: string }> = {};

  // Always run: follow-ups + appointment reminders
  try {
    results.follow_ups = await processFollowUps();
  } catch (error) {
    console.error("[Cron] Follow-ups failed:", error);
    results.follow_ups = { error: String(error) };
  }

  try {
    results.appointment_reminders = await processAppointmentReminders();
  } catch (error) {
    console.error("[Cron] Appointment reminders failed:", error);
    results.appointment_reminders = { error: String(error) };
  }

  // All automations run on every call (once per day)
  try {
    results.missed_customers = await processMissedCustomers();
  } catch (error) {
    console.error("[Cron] Missed customers failed:", error);
    results.missed_customers = { error: String(error) };
  }

  try {
    results.payment_reminders = await processPaymentReminders();
  } catch (error) {
    console.error("[Cron] Payment reminders failed:", error);
    results.payment_reminders = { error: String(error) };
  }

  try {
    results.trial_conversions = await processTrialConversions();
  } catch (error) {
    console.error("[Cron] Trial conversions failed:", error);
    results.trial_conversions = { error: String(error) };
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
