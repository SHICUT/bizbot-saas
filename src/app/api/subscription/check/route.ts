import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscriptionStatus, checkFeatureAccess } from "@/lib/payments/subscription-guard";
import type { FeatureAccess } from "@/lib/payments/subscription-guard";

/**
 * GET /api/subscription/check?feature=appointmentBooking
 *
 * Server-side feature access check.
 * Returns subscription status + whether the requested feature is allowed.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const feature = request.nextUrl.searchParams.get("feature") as keyof FeatureAccess | null;
  const status = await getSubscriptionStatus(business.id);

  if (feature) {
    const access = await checkFeatureAccess(business.id, feature);
    return NextResponse.json({ ...status, featureCheck: { feature, ...access } });
  }

  return NextResponse.json(status);
}
