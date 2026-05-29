import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRazorpaySubscription } from "@/lib/payments/razorpay";
import { getPlanById } from "@/lib/payments/plans";

/**
 * POST /api/payments/razorpay/create-subscription
 *
 * Creates a Razorpay subscription for the authenticated user.
 * Returns the subscription ID and payment link.
 *
 * Body: { plan_id: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Verify auth
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse body
  const body = await request.json();
  const { plan_id } = body;

  if (!plan_id) {
    return NextResponse.json({ error: "plan_id is required" }, { status: 400 });
  }

  // 3. Validate plan exists
  const plan = getPlanById(plan_id);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  // 4. Get business
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, email, phone")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // 5. Create subscription
  try {
    const result = await createRazorpaySubscription({
      businessId: business.id,
      planId: plan_id,
      customerEmail: business.email || user.email || "",
      customerPhone: business.phone || undefined,
      customerName: business.name,
    });

    return NextResponse.json({
      success: true,
      subscription_id: result.subscriptionId,
      short_url: result.shortUrl,
      key_id: process.env.RAZORPAY_KEY_ID, // needed for frontend checkout
      plan: {
        name: plan.name,
        price: plan.monthlyPrice,
        billing_cycle: plan.billingCycle,
      },
    });
  } catch (error) {
    console.error("[Billing] Create subscription failed:", error);
    return NextResponse.json(
      { error: "Failed to create subscription" },
      { status: 500 }
    );
  }
}
