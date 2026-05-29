import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { verifyRazorpayPayment } from "@/lib/payments/razorpay";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/payments/razorpay/verify
 *
 * Verifies a Razorpay payment after checkout completes.
 * Called from the frontend after Razorpay checkout modal closes.
 *
 * Body: {
 *   razorpay_payment_id: string,
 *   razorpay_subscription_id: string,
 *   razorpay_signature: string
 * }
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
  const {
    razorpay_payment_id,
    razorpay_subscription_id,
    razorpay_signature,
  } = body;

  if (!razorpay_payment_id || !razorpay_subscription_id || !razorpay_signature) {
    return NextResponse.json(
      { error: "Missing payment verification fields" },
      { status: 400 }
    );
  }

  // 3. Verify signature
  const isValid = verifyRazorpayPayment({
    razorpayPaymentId: razorpay_payment_id,
    razorpaySubscriptionId: razorpay_subscription_id,
    razorpaySignature: razorpay_signature,
  });

  if (!isValid) {
    return NextResponse.json(
      { error: "Payment verification failed" },
      { status: 400 }
    );
  }

  // 4. Activate subscription (use admin client to bypass RLS)
  const adminSupabase = createAdminClient();

  const { error } = await adminSupabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000
      ).toISOString(),
    })
    .eq("razorpay_subscription_id", razorpay_subscription_id);

  if (error) {
    console.error("[Billing] Failed to activate subscription:", error);
    return NextResponse.json(
      { error: "Failed to activate subscription" },
      { status: 500 }
    );
  }

  // 5. Record payment
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (business) {
    await adminSupabase.from("payments").insert({
      business_id: business.id,
      amount: 0, // Will be updated by webhook with actual amount
      currency: "INR",
      status: "captured",
      provider: "razorpay",
      razorpay_payment_id,
      razorpay_signature,
      paid_at: new Date().toISOString(),
      description: "Subscription activation",
    });
  }

  return NextResponse.json({
    success: true,
    message: "Subscription activated successfully",
  });
}
