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

  const [businessesResult, leadsResult, messagesResult, appointmentsResult, subscriptionsResult, paymentsResult] = await Promise.all([
    adminSupabase.from("businesses").select("id, name, type, plan, email, phone, created_at, whatsapp_connected, onboarding_completed"),
    adminSupabase.from("leads").select("id", { count: "exact", head: true }),
    adminSupabase.from("messages").select("id", { count: "exact", head: true }),
    adminSupabase.from("appointments").select("id", { count: "exact", head: true }),
    adminSupabase.from("subscriptions").select("id, plan, status, business_id, messages_used, message_limit"),
    adminSupabase.from("payments").select("amount, status").eq("status", "captured"),
  ]);

  const businesses = businessesResult.data || [];
  const subs = subscriptionsResult.data || [];
  const payments = paymentsResult.data || [];
  const revenue = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return NextResponse.json({
    role: "super_admin",
    stats: {
      totalBusinesses: businesses.length,
      activeBusinesses: businesses.filter((b) => b.onboarding_completed).length,
      trialUsers: subs.filter((s) => s.status === "trialing").length,
      paidUsers: subs.filter((s) => s.status === "active").length,
      totalLeads: leadsResult.count || 0,
      totalMessages: messagesResult.count || 0,
      totalAppointments: appointmentsResult.count || 0,
      totalRevenue: revenue,
    },
    businesses: businesses.map((b) => ({
      ...b,
      subscription: subs.find((s) => s.business_id === b.id) || null,
    })),
  });
}
