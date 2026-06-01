import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/admin-check";

/**
 * GET /api/admin
 * Super Admin dashboard — platform-wide stats + all businesses.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied. Super Admin only." }, { status: 403 });
  }

  const adminSupabase = createAdminClient();

  const [businessesResult, leadsResult, messagesResult, appointmentsResult, subscriptionsResult, paymentsResult, conversationsResult] = await Promise.all([
    adminSupabase.from("businesses").select("id, name, type, plan, email, phone, created_at, whatsapp_connected, onboarding_completed"),
    adminSupabase.from("leads").select("id, status", { count: "exact" }),
    adminSupabase.from("messages").select("id, is_ai_generated", { count: "exact" }),
    adminSupabase.from("appointments").select("id, status", { count: "exact" }),
    adminSupabase.from("subscriptions").select("id, plan, status, business_id, messages_used, message_limit, created_at"),
    adminSupabase.from("payments").select("amount, status, created_at").eq("status", "captured"),
    adminSupabase.from("conversations").select("id", { count: "exact", head: true }),
  ]);

  const businesses = businessesResult.data || [];
  const subs = subscriptionsResult.data || [];
  const payments = paymentsResult.data || [];
  const leads = leadsResult.data || [];
  const messages = messagesResult.data || [];
  const totalRevenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  // Monthly Recurring Revenue (active paid subs)
  const activePaidSubs = subs.filter((s) => s.status === "active");
  // Estimate MRR from plan names
  const planPrices: Record<string, number> = { starter_monthly: 799, pro_monthly: 1999, business_monthly: 3999 };
  const mrr = activePaidSubs.reduce((sum, s) => sum + (planPrices[s.plan] || 0), 0);

  // Churn: businesses that had active sub but now don't
  const totalEverPaid = new Set(subs.filter((s) => s.status === "active" || s.status === "canceled").map((s) => s.business_id)).size;
  const currentlyActive = activePaidSubs.length;
  const churnRate = totalEverPaid > 0 ? Math.round(((totalEverPaid - currentlyActive) / totalEverPaid) * 100) : 0;

  // AI messages
  const aiMessages = messages.filter((m) => m.is_ai_generated).length;

  // Converted leads
  const convertedLeads = leads.filter((l) => l.status === "converted").length;

  return NextResponse.json({
    role: "super_admin",
    stats: {
      totalBusinesses: businesses.length,
      activeBusinesses: businesses.filter((b) => b.onboarding_completed).length,
      trialUsers: subs.filter((s) => s.status === "trialing").length,
      paidUsers: currentlyActive,
      totalLeads: leadsResult.count || 0,
      convertedLeads,
      totalMessages: messagesResult.count || 0,
      aiMessages,
      totalConversations: conversationsResult.count || 0,
      totalAppointments: appointmentsResult.count || 0,
      totalRevenue,
      mrr,
      churnRate,
    },
    businesses: businesses.map((b) => ({
      ...b,
      subscription: subs.find((s) => s.business_id === b.id) || null,
    })),
  });
}
