import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/admin-check";
import { MESSAGE_LIMITS } from "@/lib/payments/plans";

/**
 * POST /api/admin/actions — Admin actions on businesses
 * Body: { action, businessId, ...params }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const admin = createAdminClient();
  const body = await request.json();
  const { action, businessId } = body;

  if (!action || !businessId) {
    return NextResponse.json({ error: "action and businessId required" }, { status: 400 });
  }

  // Log audit entry (non-blocking)
  admin.from("audit_logs").insert({
    admin_id: user.id,
    business_id: businessId,
    action,
    metadata: body,
  }).then(() => {}, () => {});

  switch (action) {
    case "extend_trial": {
      const days = body.days || 7;
      const { data: sub } = await admin
        .from("subscriptions")
        .select("id, current_period_end, trial_end")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!sub) return NextResponse.json({ error: "No subscription found" }, { status: 404 });

      const currentEnd = sub.current_period_end ? new Date(sub.current_period_end) : new Date();
      const newEnd = new Date(currentEnd.getTime() + days * 86400000);

      await admin.from("subscriptions").update({
        current_period_end: newEnd.toISOString(),
        trial_end: newEnd.toISOString(),
        status: "trialing",
      }).eq("id", sub.id);

      return NextResponse.json({ success: true, message: `Extended by ${days} days. New expiry: ${newEnd.toLocaleDateString()}` });
    }

    case "upgrade_plan": {
      const plan = body.plan; // starter | growth | business
      if (!plan || !["starter", "growth", "business"].includes(plan)) {
        return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
      }

      const { data: sub } = await admin
        .from("subscriptions")
        .select("id")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!sub) return NextResponse.json({ error: "No subscription found" }, { status: 404 });

      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 86400000); // 30 days

      await admin.from("subscriptions").update({
        plan,
        status: "active",
        message_limit: MESSAGE_LIMITS[plan] || 1000,
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
      }).eq("id", sub.id);

      await admin.from("businesses").update({ plan }).eq("id", businessId);

      return NextResponse.json({ success: true, message: `Upgraded to ${plan}` });
    }

    case "cancel_subscription": {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("id")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!sub) return NextResponse.json({ error: "No subscription" }, { status: 404 });

      await admin.from("subscriptions").update({ status: "canceled" }).eq("id", sub.id);
      await admin.from("businesses").update({ plan: "trial" }).eq("id", businessId);

      return NextResponse.json({ success: true, message: "Subscription cancelled" });
    }

    case "reset_messages": {
      const { data: sub } = await admin
        .from("subscriptions")
        .select("id")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (!sub) return NextResponse.json({ error: "No subscription" }, { status: 404 });
      await admin.from("subscriptions").update({ messages_used: 0 }).eq("id", sub.id);
      return NextResponse.json({ success: true, message: "Message count reset to 0" });
    }

    default:
      return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
  }
}
