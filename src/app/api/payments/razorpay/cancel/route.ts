import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelRazorpaySubscription } from "@/lib/payments/razorpay";

/**
 * POST /api/payments/razorpay/cancel
 *
 * Cancels the current subscription.
 * By default, cancels at end of billing period (not immediately).
 *
 * Body: { immediate?: boolean }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const immediate = body.immediate === true;

  // Get business
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  try {
    await cancelRazorpaySubscription(business.id, !immediate);

    return NextResponse.json({
      success: true,
      message: immediate
        ? "Subscription cancelled immediately"
        : "Subscription will cancel at end of billing period",
    });
  } catch (error) {
    console.error("[Billing] Cancel failed:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
