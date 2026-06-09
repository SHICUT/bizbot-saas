import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanById, usdToCents } from "@/lib/payments/plans";
import { usdToInrPaiseLive } from "@/lib/payments/exchange-rate";
import { validateCoupon, redeemCoupon } from "@/lib/payments/coupons";
import Razorpay from "razorpay";

/**
 * POST /api/payments/razorpay/create-subscription
 *
 * Creates a Razorpay Order for the selected plan.
 * Supports optional coupon code — discount is validated server-side
 * and the DISCOUNTED amount is sent to Razorpay.
 *
 * Body: { plan_id: string, coupon_code?: string }
 * Returns: { order_id, key_id, amount, currency, plan, discount? }
 */
export async function POST(request: NextRequest) {
  const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
  const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!razorpayKeyId || !razorpayKeySecret) {
    return NextResponse.json({
      error: "Payment system not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to environment variables.",
    }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Please log in to upgrade." }, { status: 401 });
  }

  const body = await request.json();
  const { plan_id, coupon_code } = body;

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

  // ─── Coupon Validation (server-side, never trust frontend) ──────────────
  let finalAmountUSD = plan.priceUSD;
  let couponId: string | null = null;
  let discountAmountUSD = 0;

  if (coupon_code) {
    const couponResult = await validateCoupon(coupon_code, plan.tier, plan.priceUSD, business.id);
    if (!couponResult.valid) {
      return NextResponse.json({ error: couponResult.error }, { status: 400 });
    }
    finalAmountUSD = couponResult.finalAmount!;
    discountAmountUSD = couponResult.discountAmount!;
    couponId = couponResult.coupon!.id;
  }

  // Ensure amount is at least $1 (Razorpay minimum)
  if (finalAmountUSD < 1) {
    finalAmountUSD = 1;
  }

  try {
    const razorpay = new Razorpay({ key_id: razorpayKeyId, key_secret: razorpayKeySecret });

    // Convert FINAL discounted USD price to INR paise using live exchange rate
    const amountInPaise = await usdToInrPaiseLive(finalAmountUSD);

    // Create Razorpay Order with discounted amount
    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `bb_${Date.now()}`,
      notes: {
        business_id: business.id,
        plan_id: plan_id,
        plan_tier: plan.tier,
        billing_cycle: plan.billingCycle,
        user_email: user.email || "",
        price_usd: String(finalAmountUSD),
        original_price_usd: String(plan.priceUSD),
        coupon_code: coupon_code || "",
        discount_usd: String(discountAmountUSD),
      },
    });

    // Store pending payment in database (final discounted amount in USD cents)
    const adminSupabase = createAdminClient();
    await adminSupabase.from("payments").insert({
      business_id: business.id,
      amount: usdToCents(finalAmountUSD),
      currency: "USD",
      status: "pending",
      provider: "razorpay",
      razorpay_order_id: order.id,
      description: `${plan.name} Plan (${plan.billingCycle})${coupon_code ? ` — Coupon: ${coupon_code}` : ""}`,
    });

    // Store coupon info for redemption after successful payment
    if (couponId) {
      await adminSupabase.from("payments").update({
        metadata: {
          coupon_id: couponId,
          coupon_code: coupon_code,
          original_amount_usd: plan.priceUSD,
          discount_amount_usd: discountAmountUSD,
          final_amount_usd: finalAmountUSD,
        },
      }).eq("razorpay_order_id", order.id);
    }

    return NextResponse.json({
      success: true,
      order_id: order.id,
      key_id: razorpayKeyId,
      amount: amountInPaise,
      currency: "INR",
      plan: {
        name: plan.name,
        tier: plan.tier,
        price: finalAmountUSD,
        original_price: plan.priceUSD,
        billing_cycle: plan.billingCycle,
      },
      discount: couponId ? {
        coupon_code: coupon_code,
        original_amount: plan.priceUSD,
        discount_amount: discountAmountUSD,
        final_amount: finalAmountUSD,
      } : null,
      prefill: {
        name: business.name,
        email: business.email || user.email || "",
        contact: business.phone || "",
      },
    });
  } catch (error: unknown) {
    let msg = "Unknown error";
    let debugInfo: Record<string, unknown> = {};

    try {
      if (error instanceof Error) {
        msg = error.message;
        debugInfo = { type: "Error", message: error.message };
      } else if (error && typeof error === "object") {
        const serialized = JSON.parse(JSON.stringify(error));
        debugInfo = serialized;
        msg = serialized.error?.description || serialized.description || serialized.message || JSON.stringify(serialized);
      } else {
        msg = String(error);
      }
    } catch {
      msg = "Error parsing failed";
    }

    console.error("[Razorpay] Error:", msg, debugInfo);

    return NextResponse.json({
      error: `Payment failed: ${msg}`,
    }, { status: 500 });
  }
}
