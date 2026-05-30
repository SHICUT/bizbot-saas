import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";

/**
 * POST /api/payments/razorpay/verify
 *
 * Verifies Razorpay payment after checkout completes.
 * Activates the subscription on successful verification.
 *
 * Body: {
 *   razorpay_order_id: string,
 *   razorpay_payment_id: string,
 *   razorpay_signature: string,
 *   plan_id: string
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan_id } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  // Verify signature
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
  }

  const expectedSignature = createHmac("sha256", secret)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature !== razorpay_signature) {
    return NextResponse.json({ error: "Payment verification failed. Signature mismatch." }, { status: 400 });
  }

  // Payment verified — activate subscription
  const adminSupabase = createAdminClient();

  const { data: business } = await adminSupabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  // Determine plan details
  const { getPlanById } = await import("@/lib/payments/plans");
  const plan = plan_id ? getPlanById(plan_id) : null;
  const tier = plan?.tier || "starter";
  const messageLimit = plan?.messageLimit || 1000;
  const billingCycle = plan?.billingCycle || "monthly";

  const now = new Date();
  const periodEnd = new Date(now.getTime() + (billingCycle === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000);

  // Update payment record
  await adminSupabase
    .from("payments")
    .update({
      status: "captured",
      razorpay_payment_id,
      razorpay_signature,
      payment_method: "razorpay",
      paid_at: now.toISOString(),
    })
    .eq("razorpay_order_id", razorpay_order_id);

  // Update or create subscription
  const { data: existingSub } = await adminSupabase
    .from("subscriptions")
    .select("id")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const subData = {
    plan: tier,
    status: "active",
    billing_cycle: billingCycle,
    amount: plan?.priceInPaise || 0,
    message_limit: messageLimit,
    messages_used: 0,
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    trial_start: null,
    trial_end: null,
    provider: "razorpay",
  };

  if (existingSub) {
    await adminSupabase.from("subscriptions").update(subData).eq("id", existingSub.id);
  } else {
    await adminSupabase.from("subscriptions").insert({ business_id: business.id, ...subData });
  }

  // Update business plan
  await adminSupabase
    .from("businesses")
    .update({ plan: tier })
    .eq("id", business.id);

  return NextResponse.json({
    success: true,
    plan: tier,
    message: `${tier.charAt(0).toUpperCase() + tier.slice(1)} plan activated successfully!`,
  });
}
