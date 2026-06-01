import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/admin-check";

/**
 * GET /api/admin/business?id=xxx
 *
 * Super Admin drill-down into a specific business.
 * Returns: business details, leads, conversations, appointments, messages.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify super admin
  if (!user || !isSuperAdmin(user.email)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const adminSupabase = createAdminClient();

  const businessId = request.nextUrl.searchParams.get("id");
  if (!businessId) return NextResponse.json({ error: "Business ID required" }, { status: 400 });

  // Fetch all business data in parallel
  const [business, leads, conversations, appointments, messages, subscription, notes] = await Promise.all([
    adminSupabase.from("businesses").select("*").eq("id", businessId).single(),
    adminSupabase.from("leads").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(50),
    adminSupabase.from("conversations").select("*, leads(name, phone)").eq("business_id", businessId).order("last_message_at", { ascending: false }).limit(20),
    adminSupabase.from("appointments").select("*").eq("business_id", businessId).order("scheduled_at", { ascending: false }).limit(20),
    adminSupabase.from("messages").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    adminSupabase.from("subscriptions").select("*").eq("business_id", businessId).order("created_at", { ascending: false }).limit(1).single(),
    adminSupabase.from("admin_notes").select("*").eq("business_id", businessId).order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    business: business.data,
    leads: leads.data || [],
    conversations: conversations.data || [],
    appointments: appointments.data || [],
    totalMessages: messages.count || 0,
    subscription: subscription.data,
    adminNotes: notes.data || [],
  });
}

/**
 * POST /api/admin/business
 * Add admin note to a business.
 * Body: { business_id, note }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminSupabase = createAdminClient();
  if (!user || !isSuperAdmin(user.email)) return NextResponse.json({ error: "Access denied" }, { status: 403 });

  const { business_id, note } = await request.json();
  if (!business_id || !note) return NextResponse.json({ error: "business_id and note required" }, { status: 400 });

  await adminSupabase.from("admin_notes").insert({ business_id, admin_user_id: user.id, note });
  return NextResponse.json({ success: true });
}
