import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { validateCoupon } from "@/lib/payments/coupons";
import { getPlanById } from "@/lib/payments/plans";

/**
 * POST /api/coupons/validate
 *
 * Validates a coupon code against a specific plan.
 * Returns discount details if valid.
 *
 * Body: { code: string, plan_id: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { code, plan_id } = body;

  if (!code || !plan_id) {
    return NextResponse.json({ error: "Coupon code and plan are required." }, { status: 400 });
  }

  const plan = getPlanById(plan_id);
  if (!plan) {
    return NextResponse.json({ error: "Invalid plan." }, { status: 400 });
  }

  const result = await validateCoupon(code, plan.tier, plan.priceUSD);

  if (!result.valid) {
    return NextResponse.json({ valid: false, error: result.error }, { status: 200 });
  }

  return NextResponse.json({
    valid: true,
    coupon: {
      code: result.coupon!.code,
      description: result.coupon!.description,
      discount_type: result.coupon!.discount_type,
      discount_value: result.coupon!.discount_value,
    },
    originalAmount: result.originalAmount,
    discountAmount: result.discountAmount,
    finalAmount: result.finalAmount,
  });
}
