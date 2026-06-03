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
      amount: plan.priceInCents,
      currency: "INR",
      receipt: `bb_${Date.now()}`,
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
      amount: plan.priceInCents,
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
      amount: plan.priceInCents,
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
  } catch (error: unknown) {
    // Extract the REAL error from Razorpay SDK
    // Razorpay throws: { statusCode: 400, error: { code, description, source, step, reason } }
    let msg = "Unknown error";
    let debugInfo: Record<string, unknown> = {};

    try {
      if (error instanceof Error) {
        msg = error.message;
        debugInfo = { type: "Error", message: error.message, stack: error.stack?.split("\n")[0] };
      } else if (error && typeof error === "object") {
        // Force serialize to get all properties
        const serialized = JSON.parse(JSON.stringify(error));
        debugInfo = serialized;

        // Extract message from Razorpay's nested format
        if (serialized.error?.description) {
          msg = serialized.error.description;
        } else if (serialized.description) {
          msg = serialized.description;
        } else if (serialized.message) {
          msg = serialized.message;
        } else if (serialized.error && typeof serialized.error === "string") {
          msg = serialized.error;
        } else {
          msg = JSON.stringify(serialized);
        }
      } else {
        msg = String(error);
        debugInfo = { raw: String(error) };
      }
    } catch {
      msg = "Error parsing failed";
      debugInfo = { parseError: true };
    }

    console.error("[Razorpay] FULL ERROR:", JSON.stringify(debugInfo));
    console.error("[Razorpay] Error message:", msg);
    console.error("[Razorpay] Key ID prefix:", razorpayKeyId?.substring(0, 12));

    return NextResponse.json({
      error: `Payment failed: ${msg}`,
      razorpay_error: debugInfo,
    }, { status: 500 });
  }
}
