import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus } from "@/lib/payments/subscription-guard";

/**
 * GET /api/payments/status
 *
 * Returns the current subscription status for the authenticated user.
 * Used by the dashboard to show usage, plan info, and upgrade prompts.
 */
export async function GET() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const status = await getSubscriptionStatus(business.id);

  return NextResponse.json(status);
}
