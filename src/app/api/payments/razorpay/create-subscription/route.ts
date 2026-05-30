import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanById } from "@/lib/payments/plans";
import Razorpay from "razorpay";

/**
 * POST /api/payments/razorpay/create-subscription
 *
 * Creates a Razorpay Order for the selected plan.
 * Uses Razorpay Orders API (simpler, more reliable than Subscriptions API for MVP).
 *
 * Body: { plan_id: string }
 * Returns: { order_id, key_id, amount, currency, plan }
 */
export async function POST(request: NextRequest) {
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeyId || !razorpayKeySecret) {
    return NextResponse.json({
      error: "Payment system not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment variables.",
      debug: {
        RAZORPAY_KEY_ID_set: !!razorpayKeyId,
        RAZORPAY_KEY_SECRET_set: !!razorpayKeySecret,
      },
    }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to upgrade." }, { status: 401 });
  }

  const body = await request.json();
  const { plan_id } = body;

  if (!plan_id) {
    return NextResponse.json({ error: "Please select a plan." }, { status: 400 });
  }

  const plan = getPlanById(plan_id);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, email, phone")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found." }, { status: 404 });
  }

  try {
    const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

    // Create Razorpay Order
    const order = await razorpay.orders.create({
      amount: plan.priceInPaise,
      currency: "INR",
      receipt: `bizbot_${business.id}_${Date.now()}`,
      notes: {
        business_id: business.id,
        plan_id: plan_id,
        plan_tier: plan.tier,
        billing_cycle: plan.billingCycle,
        user_email: user.email || "",
      },
    });

    // Store pending payment in database
    const adminSupabase = createAdminClient();
    await adminSupabase.from("payments").insert({
      business_id: business.id,
      amount: plan.priceInPaise,
      currency: "INR",
      status: "pending",
      provider: "razorpay",
      razorpay_order_id: order.id,
      description: `${plan.name} Plan (${plan.billingCycle})`,
    });

    return NextResponse.json({
      success: true,
      order_id: order.id,
      key_id: razorpayKeyId,
      amount: plan.priceInPaise,
      currency: "INR",
      plan: {
        name: plan.name,
        tier: plan.tier,
        price: plan.monthlyPrice,
        billing_cycle: plan.billingCycle,
      },
      prefill: {
        name: business.name,
        email: business.email || user.email || "",
        contact: business.phone || "",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[Razorpay] Order creation failed:", msg);
    return NextResponse.json({ error: `Payment setup failed: ${msg}` }, { status: 500 });
  }
}
