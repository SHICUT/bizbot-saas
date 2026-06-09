import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAllCoupons, createCoupon, updateCoupon, deleteCoupon } from "@/lib/payments/coupons";

/**
 * Admin Coupon Management API
 * GET    - List all coupons
 * POST   - Create coupon
 * PATCH  - Update coupon
 * DELETE - Delete coupon
 */

async function isAdmin(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return data?.role === "super_admin";
}

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const coupons = await getAllCoupons();

  // Get redemption counts
  const adminDb = createAdminClient();
  const { data: redemptions } = await adminDb
    .from("coupon_redemptions")
    .select("coupon_id, redeemed_at, plan_id, discount_amount, final_amount, business_id");

  return NextResponse.json({ coupons, redemptions: redemptions || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { code, description, discount_type, discount_value, usage_limit, expires_at, applicable_plans, min_amount } = body;

  if (!code || !discount_type || !discount_value) {
    return NextResponse.json({ error: "Code, discount type, and value are required." }, { status: 400 });
  }

  if (!["percentage", "fixed"].includes(discount_type)) {
    return NextResponse.json({ error: "Discount type must be 'percentage' or 'fixed'." }, { status: 400 });
  }

  if (discount_type === "percentage" && (discount_value <= 0 || discount_value > 100)) {
    return NextResponse.json({ error: "Percentage must be between 1 and 100." }, { status: 400 });
  }

  const result = await createCoupon({
    code,
    description,
    discount_type,
    discount_value: Number(discount_value),
    usage_limit: usage_limit ? Number(usage_limit) : null,
    expires_at: expires_at || null,
    applicable_plans: applicable_plans && applicable_plans.length > 0 ? applicable_plans : null,
    min_amount: min_amount ? Number(min_amount) : 0,
    created_by: user.id,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, coupon: result.coupon });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ error: "Coupon ID is required." }, { status: 400 });
  }

  const result = await updateCoupon(id, updates);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !(await isAdmin(user.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Coupon ID is required." }, { status: 400 });
  }

  const result = await deleteCoupon(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
