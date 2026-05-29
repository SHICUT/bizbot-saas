import { NextRequest, NextResponse } from "next/server";
import { processFollowUps } from "@/lib/ai/follow-up";

/**
 * GET /api/cron/follow-ups
 *
 * Cron endpoint to process pending follow-up messages.
 * Should be called every hour by Vercel Cron or external scheduler.
 *
 * Security: Protected by CRON_SECRET header.
 * In Vercel, cron jobs automatically include the correct authorization.
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (prevents unauthorized access)
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processFollowUps();

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Cron] Follow-up processing failed:", error);
    return NextResponse.json(
      { error: "Processing failed" },
      { status: 500 }
    );
  }
}
