import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth/admin-check";
import { generateCompleteDemo, resetDemo } from "@/lib/demo/generator";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/admin/demo — Generate or reset demo data
 * Body: { action: "generate" | "reset" }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const body = await request.json();
  const { action } = body;

  if (action === "generate") {
    const result = await generateCompleteDemo(user.id);
    return NextResponse.json(result);
  }

  if (action === "reset") {
    const result = await resetDemo();
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

/**
 * GET /api/admin/demo — Get demo status
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isSuperAdmin(user.email)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: demoBiz } = await admin.from("businesses").select("id, name, created_at").eq("is_demo", true).limit(1).single();

  if (!demoBiz) {
    return NextResponse.json({ exists: false, stats: null });
  }

  const [leads, convs, apts, msgs] = await Promise.all([
    admin.from("leads").select("id", { count: "exact", head: true }).eq("is_demo", true),
    admin.from("conversations").select("id", { count: "exact", head: true }).eq("is_demo", true),
    admin.from("appointments").select("id", { count: "exact", head: true }).eq("is_demo", true),
    admin.from("messages").select("id", { count: "exact", head: true }).eq("is_demo", true),
  ]);

  return NextResponse.json({
    exists: true,
    business: demoBiz,
    stats: {
      leads: leads.count || 0,
      conversations: convs.count || 0,
      appointments: apts.count || 0,
      messages: msgs.count || 0,
    },
  });
}
