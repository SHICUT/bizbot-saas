import { NextRequest, NextResponse } from "next/server";
import {
  processAppointmentReminders,
  processMissedCustomers,
  processPaymentReminders,
  processTrialConversions,
} from "@/lib/automations/scheduler";

/**
 * GET /api/cron/automations
 *
 * Master cron endpoint that runs all automation schedulers.
 * Called every 15 minutes by Vercel Cron.
 *
 * Each scheduler checks its own timing internally:
 * - Appointment reminders: every run (15 min)
 * - Missed customers: once per day
 * - Payment reminders: once per day
 * - Trial conversions: once per day
 */
export async function GET(request: NextRequest) {
  // Verify cron authorization
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, { sent: number; skipped: number } | { error: string }> = {};

  // 1. Appointment reminders (every run)
  try {
    results.appointment_reminders = await processAppointmentReminders();
  } catch (error) {
    console.error("[Cron] Appointment reminders failed:", error);
    results.appointment_reminders = { error: String(error) };
  }

  // 2. Missed customers (check if we should run — once per day)
  const hour = new Date().getUTCHours();
  if (hour === 9) {
    // Run daily automations at 9 AM UTC (2:30 PM IST)
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
  }

  return NextResponse.json({
    success: true,
    timestamp: new Date().toISOString(),
    results,
  });
}
