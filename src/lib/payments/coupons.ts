/**
 * Coupon Validation & Discount Calculation
 *
 * All coupon logic is server-side only. Never trust frontend calculations.
 * Flow: validate coupon → calculate discount → return final amount → create Razorpay order with final amount.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  is_active: boolean;
  usage_limit: number | null;
  per_user_limit: number | null;
  usage_count: number;
  expires_at: string | null;
  applicable_plans: string[] | null;
  min_amount: number;
  created_at: string;
}

export interface CouponValidationResult {
  valid: boolean;
  error?: string;
  coupon?: Coupon;
  originalAmount?: number;
  discountAmount?: number;
  finalAmount?: number;
}

/**
 * Validate a coupon code against a specific plan and amount.
 * Returns the calculated discount if valid.
 * Optional businessId prevents duplicate redemptions by same business.
 */
export async function validateCoupon(
  code: string,
  planTier: string,
  originalAmountUSD: number,
  businessId?: string
): Promise<CouponValidationResult> {
  if (!code || !code.trim()) {
    return { valid: false, error: "Please enter a coupon code." };
  }

  const supabase = createAdminClient();
  const normalizedCode = code.trim().toUpperCase();

  // Fetch coupon
  const { data: coupon, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("code", normalizedCode)
    .single();

  if (error || !coupon) {
    return { valid: false, error: "Invalid coupon code." };
  }

  // Check active
  if (!coupon.is_active) {
    return { valid: false, error: "This coupon is no longer active." };
  }

  // Check expiry
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: "This coupon has expired." };
  }

  // Check usage limit
  if (coupon.usage_limit !== null && coupon.usage_count >= coupon.usage_limit) {
    return { valid: false, error: "This coupon has reached its usage limit." };
  }

  // Check plan applicability
  if (coupon.applicable_plans && coupon.applicable_plans.length > 0) {
    if (!coupon.applicable_plans.includes(planTier)) {
      return { valid: false, error: `This coupon is not valid for the ${planTier} plan.` };
    }
  }

  // Check minimum amount
  if (coupon.min_amount && originalAmountUSD < coupon.min_amount) {
    return { valid: false, error: `Minimum order amount is $${coupon.min_amount}.` };
  }

  // Prevent exceeding per-user redemption limit
  if (businessId) {
    const perUserLimit = coupon.per_user_limit ?? 1; // Default: 1 use per business
    
    const { count } = await supabase
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", coupon.id)
      .eq("business_id", businessId);

    if (count !== null && count >= perUserLimit) {
      return { valid: false, error: perUserLimit === 1 
        ? "You have already used this coupon." 
        : `This coupon can only be used ${perUserLimit} times per account.` 
      };
    }
  }

  // Calculate discount
  let discountAmount: number;
  if (coupon.discount_type === "percentage") {
    discountAmount = Math.round((originalAmountUSD * coupon.discount_value / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(coupon.discount_value, originalAmountUSD);
  }

  const finalAmount = Math.max(0, Math.round((originalAmountUSD - discountAmount) * 100) / 100);

  return {
    valid: true,
    coupon,
    originalAmount: originalAmountUSD,
    discountAmount,
    finalAmount,
  };
}

/**
 * Record a coupon redemption and increment usage count.
 * Call this AFTER successful payment only.
 */
export async function redeemCoupon(
  couponId: string,
  businessId: string,
  planId: string,
  originalAmount: number,
  discountAmount: number,
  finalAmount: number
): Promise<void> {
  const supabase = createAdminClient();

  // Increment usage count
  await supabase.rpc("increment_coupon_usage", { p_coupon_id: couponId });

  // Record redemption
  await supabase.from("coupon_redemptions").insert({
    coupon_id: couponId,
    business_id: businessId,
    plan_id: planId,
    original_amount: originalAmount,
    discount_amount: discountAmount,
    final_amount: finalAmount,
  });
}

/**
 * Get all coupons (admin use).
 */
export async function getAllCoupons(): Promise<Coupon[]> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });
  return (data || []) as Coupon[];
}

/**
 * Create a new coupon (admin use).
 */
export async function createCoupon(input: {
  code: string;
  description?: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  usage_limit?: number | null;
  per_user_limit?: number | null;
  expires_at?: string | null;
  applicable_plans?: string[] | null;
  min_amount?: number;
  created_by?: string;
}): Promise<{ success: boolean; error?: string; coupon?: Coupon }> {
  const supabase = createAdminClient();
  const normalizedCode = input.code.trim().toUpperCase();

  // Check duplicate
  const { data: existing } = await supabase
    .from("coupons")
    .select("id")
    .eq("code", normalizedCode)
    .single();

  if (existing) {
    return { success: false, error: "A coupon with this code already exists." };
  }

  const { data, error } = await supabase
    .from("coupons")
    .insert({
      code: normalizedCode,
      description: input.description || null,
      discount_type: input.discount_type,
      discount_value: input.discount_value,
      usage_limit: input.usage_limit ?? null,
      per_user_limit: input.per_user_limit ?? 1,
      expires_at: input.expires_at ?? null,
      applicable_plans: input.applicable_plans ?? null,
      min_amount: input.min_amount ?? 0,
      created_by: input.created_by || null,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, coupon: data as Coupon };
}

/**
 * Update a coupon (admin use).
 */
export async function updateCoupon(
  couponId: string,
  updates: Partial<{
    description: string;
    discount_type: "percentage" | "fixed";
    discount_value: number;
    is_active: boolean;
    usage_limit: number | null;
    per_user_limit: number | null;
    expires_at: string | null;
    applicable_plans: string[] | null;
    min_amount: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("coupons")
    .update(updates)
    .eq("id", couponId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

/**
 * Delete a coupon (admin use).
 */
export async function deleteCoupon(couponId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("coupons")
    .delete()
    .eq("id", couponId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}
