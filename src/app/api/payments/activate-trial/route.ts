import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/payments/activate-trial
 *
 * Activates a free trial or marks the selected plan.
 * For trial: immediately activates 14-day trial.
 * For paid plans: marks intent (actual payment handled by Razorpay flow).
 *
 * Body: { plan: "trial" | "starter" | "pro" | "business" }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { plan } = body;

  if (!plan || !["trial", "starter", "pro", "business"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const adminSupabase = createAdminClient();

  // Get or create business
  let { data: business } = await adminSupabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) {
    // Create business if it doesn't exist
    const { data: newBiz, error: bizErr } = await adminSupabase
      .from("businesses")
      .insert({
        owner_id: user.id,
        name: user.user_metadata?.business_name || "My Business",
        email: user.email,
        phone: user.user_metadata?.phone || null,
        type: "other",
        plan: plan === "trial" ? "trial" : plan,
        is_active: true,
      })
      .select("id")
      .single();

    if (bizErr || !newBiz) {
      return NextResponse.json({ error: "Failed to create business" }, { status: 500 });
    }
    business = newBiz;
  }

  // Set trial/subscription dates
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days

  const messageLimits: Record<string, number> = {
    trial: 1000,
    starter: 1000,
    pro: 5000,
    business: 20000,
  };

  // Upsert subscription
  const { error: subErr } = await adminSupabase
    .from("subscriptions")
    .upsert(
      {
        business_id: business.id,
        plan: plan === "trial" ? "starter" : plan,
        status: plan === "trial" ? "trialing" : "created",
        billing_cycle: "monthly",
        message_limit: messageLimits[plan] || 1000,
        messages_used: 0,
        trial_start: plan === "trial" ? now.toISOString() : null,
        trial_end: plan === "trial" ? trialEnd.toISOString() : null,
        current_period_start: now.toISOString(),
        current_period_end: plan === "trial" ? trialEnd.toISOString() : null,
      },
      { onConflict: "business_id" }
    );

  if (subErr) {
    return NextResponse.json({ error: "Failed to activate plan" }, { status: 500 });
  }

  // Update business plan
  await adminSupabase
    .from("businesses")
    .update({
      plan: plan === "trial" ? "trial" : plan,
      onboarding_completed: true,
    })
    .eq("id", business.id);

  return NextResponse.json({
    success: true,
    plan: plan === "trial" ? "trial" : plan,
    trial_end: plan === "trial" ? trialEnd.toISOString() : null,
    message: plan === "trial"
      ? "14-day free trial activated! You have full Starter access."
      : `${plan} plan selected. Complete payment to activate.`,
  });
}
