import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSuperAdmin } from "@/lib/auth/admin-check";

/**
 * GET /api/admin/audit-logs — Fetch audit logs with filters
 * POST /api/admin/audit-logs — Create an audit log entry
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const admin = createAdminClient();
  const url = request.nextUrl;
  const action = url.searchParams.get("action");
  const businessId = url.searchParams.get("businessId");
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 20;
  const offset = (page - 1) * limit;

  let query = admin
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (action && action !== "all") query = query.eq("action", action);
  if (businessId) query = query.eq("business_id", businessId);

  const { data: logs, count, error } = await query;

  if (error) {
    // Table may not exist yet
    return NextResponse.json({ logs: [], total: 0, page });
  }

  return NextResponse.json({ logs: logs || [], total: count || 0, page });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { action, businessId, metadata } = await request.json();

  if (!action) return NextResponse.json({ error: "action required" }, { status: 400 });

  try {
    await admin.from("audit_logs").insert({
      admin_id: user.id,
      business_id: businessId || null,
      action,
      metadata: metadata || {},
    });
    return NextResponse.json({ success: true });
  } catch {
    // Table may not exist — non-fatal
    return NextResponse.json({ success: true, note: "Audit log table may not exist yet" });
  }
}
