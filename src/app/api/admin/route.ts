import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/admin-check";
import { PRICES, MESSAGE_LIMITS } from "@/lib/payments/plans";

/**
 * GET /api/admin — Super Admin Platform Overview
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const admin = createAdminClient();

  const [bizResult, leadsResult, msgsResult, aptsResult, subsResult, convsResult, broadcastsResult] = await Promise.all([
    admin.from("businesses").select("*"),
    admin.from("leads").select("id, status, business_id", { count: "exact" }),
    admin.from("messages").select("id", { count: "exact", head: true }),
    admin.from("appointments").select("id", { count: "exact", head: true }),
    admin.from("subscriptions").select("*"),
    admin.from("conversations").select("id", { count: "exact", head: true }),
    admin.from("broadcast_campaigns").select("id", { count: "exact", head: true }),
  ]);

  const businesses = bizResult.data || [] as Record<string, unknown>[];
  const subs = (subsResult.data || []) as Array<Record<string, unknown>>;
  const leads = (leadsResult.data || []) as Array<Record<string, string>>;
  const now = new Date();

  // Plan pricing for MRR calculation (USD monthly)
  const planMRR: Record<string, number> = { starter: PRICES.starter.monthly, growth: PRICES.growth.monthly, business: PRICES.business.monthly };

  const activeSubs = subs.filter((s: Record<string, unknown>) => s.status === "active");
  const trialSubs = subs.filter((s: Record<string, unknown>) => s.status === "trialing");
  const expiredSubs = subs.filter((s: Record<string, unknown>) => {
    if (!s.current_period_end) return false;
    return new Date(s.current_period_end as string) < now;
  });

  const mrr = activeSubs.reduce((sum: number, s: Record<string, unknown>) => sum + (planMRR[s.plan as string] || 0), 0);
  const arr = mrr * 12;

  const whatsappConnected = businesses.filter((b: Record<string, unknown>) => b.whatsapp_connected).length;

  // Per-business lead counts
  const leadsByBiz: Record<string, number> = {};
  leads.forEach((l: Record<string, string>) => { leadsByBiz[l.business_id] = (leadsByBiz[l.business_id] || 0) + 1; });

  const stats = {
    totalBusinesses: businesses.length,
    activeBusinesses: businesses.filter((b: Record<string, unknown>) => b.onboarding_completed).length,
    trialUsers: trialSubs.length,
    paidUsers: activeSubs.length,
    expiredUsers: expiredSubs.length,
    whatsappConnected,
    totalLeads: leadsResult.count || 0,
    totalConversations: convsResult.count || 0,
    totalBroadcasts: broadcastsResult.count || 0,
    totalAppointments: aptsResult.count || 0,
    totalMessages: msgsResult.count || 0,
    mrr,
    arr,
  };

  // Business list with subscription details
  const businessList = businesses.map((b: Record<string, unknown>) => {
    const sub = subs.find((s: Record<string, unknown>) => s.business_id === b.id);
    const periodEnd = sub?.current_period_end ? new Date(sub.current_period_end as string) : null;
    const remainingDays = periodEnd ? Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / 86400000)) : 0;
    const isExpired = periodEnd ? periodEnd < now : true;

    return {
      id: b.id,
      name: b.name || "Unnamed",
      owner_name: b.owner_name || "",
      email: b.email || "",
      phone: b.phone || "",
      type: b.type || "other",
      plan: sub?.plan || "none",
      status: isExpired ? "expired" : sub?.status || "none",
      whatsapp_connected: b.whatsapp_connected || false,
      created_at: b.created_at,
      expiry_date: sub?.current_period_end || null,
      remaining_days: remainingDays,
      leads_count: leadsByBiz[b.id as string] || 0,
      messages_used: sub?.messages_used || 0,
      message_limit: sub?.message_limit || 0,
      onboarding_completed: b.onboarding_completed || false,
    };
  });

  return NextResponse.json({ role: "super_admin", stats, businesses: businessList });
}
