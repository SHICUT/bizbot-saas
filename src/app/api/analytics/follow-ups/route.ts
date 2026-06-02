import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getFollowUpStats } from "@/lib/ai/follow-up";

/**
 * GET /api/analytics/follow-ups
 * Returns follow-up automation stats
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: business } = await admin
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const stats = await getFollowUpStats(business.id);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("[Analytics FollowUps] Error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
