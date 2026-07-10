import { NextRequest, NextResponse } from "next/server";
import {
  processAppointmentReminders,
  processPostVisitFollowUps,
  processReEngagement,
} from "@/lib/crm/site-visit-automation";

/**
 * Cron: Process appointment reminders + post-visit automation
 *
 * Called every 15 minutes by Vercel Cron.
 * Configure in vercel.json crons with path /api/cron/reminders, schedule every 15 minutes
 *
 * Actions:
 * 1. Send 24h and 2h reminders for upcoming appointments
 * 2. Send post-visit feedback requests (6h after visit)
 * 3. Re-engage leads who visited but haven't booked (48h after)
 */
export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [reminders, postVisit, reEngage] = await Promise.all([
      processAppointmentReminders(),
      processPostVisitFollowUps(),
      processReEngagement(),
    ]);

    const summary = {
      reminders: { sent: reminders.sent, errors: reminders.errors },
      postVisit: { sent: postVisit.sent, errors: postVisit.errors },
      reEngagement: { sent: reEngage.sent, errors: reEngage.errors },
      total_sent: reminders.sent + postVisit.sent + reEngage.sent,
      timestamp: new Date().toISOString(),
    };

    console.log("[Cron:Reminders]", JSON.stringify(summary));
    return NextResponse.json(summary);
  } catch (error) {
    console.error("[Cron:Reminders] Error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
