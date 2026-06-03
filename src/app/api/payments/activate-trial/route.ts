import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TRIAL_DURATION_DAYS } from "@/lib/payments/plans";

/**
 * POST /api/payments/activate-trial
 *
 * Activates a free trial or marks the selected plan.
 * Body: { plan: "trial" | "starter" | "pro" | "business" }
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      console.error("[activate-trial] Auth failed:", authErr?.message || "No user");
      return NextResponse.json({ error: "Please log in again and retry." }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = body;

    if (!plan || !["trial", "starter", "growth", "business"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 });
    }

    const adminSupabase = createAdminClient();

    // Get business
    const { data: business, error: bizFetchErr } = await adminSupabase
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (bizFetchErr || !business) {
      // Business doesn't exist — create it
      const { data: newBiz, error: bizCreateErr } = await adminSupabase
        .from("businesses")
        .insert({
          owner_id: user.id,
          name: user.user_metadata?.business_name || "My Business",
          email: user.email,
          phone: user.user_metadata?.phone || null,
          type: "other",
          plan: "trial",
          is_active: true,
        })
        .select("id")
        .single();

      if (bizCreateErr || !newBiz) {
        console.error("[activate-trial] Create business failed:", bizCreateErr?.message);
        return NextResponse.json({ error: "Setup failed. Please try again." }, { status: 500 });
      }

      // Wait for trigger to create subscription, then update it
      await new Promise((r) => setTimeout(r, 1000));
      return await activateSubscription(adminSupabase, newBiz.id, plan);
    }

    return await activateSubscription(adminSupabase, business.id, plan);
  } catch (err) {
    console.error("[activate-trial] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

async function activateSubscription(
  adminSupabase: ReturnType<typeof createAdminClient>,
  businessId: string,
  plan: string
) {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const messageLimits: Record<string, number> = {
    trial: 100,
    starter: 1000,
    growth: 5000,
    business: 20000,
  };

  // Find existing subscription
  const { data: existingSub } = await adminSupabase
    .from("subscriptions")
    .select("id")
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const subData = {
    plan: plan === "trial" ? "trial" : plan,
    status: plan === "trial" ? "trialing" : "created",
    message_limit: messageLimits[plan] || 1000,
    messages_used: 0,
    trial_start: plan === "trial" ? now.toISOString() : null,
    trial_end: plan === "trial" ? trialEnd.toISOString() : null,
    current_period_start: now.toISOString(),
    current_period_end: plan === "trial" ? trialEnd.toISOString() : null,
  };

  if (existingSub) {
    const { error } = await adminSupabase
      .from("subscriptions")
      .update(subData)
      .eq("id", existingSub.id);

    if (error) {
      console.error("[activate-trial] Update sub failed:", error.message);
      return NextResponse.json({ error: "Failed to activate. Please try again." }, { status: 500 });
    }
  } else {
    const { error } = await adminSupabase
      .from("subscriptions")
      .insert({ business_id: businessId, ...subData });

    if (error) {
      console.error("[activate-trial] Insert sub failed:", error.message);
      return NextResponse.json({ error: "Failed to activate. Please try again." }, { status: 500 });
    }
  }

  // Update business
  await adminSupabase
    .from("businesses")
    .update({ plan: plan === "trial" ? "trial" : plan, onboarding_completed: true })
    .eq("id", businessId);

  return NextResponse.json({
    success: true,
    plan: plan === "trial" ? "trial" : plan,
    trial_end: plan === "trial" ? trialEnd.toISOString() : null,
  });
}
