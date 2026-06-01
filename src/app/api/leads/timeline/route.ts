import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/leads/timeline?leadId=xxx — Fetch timeline for a lead
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: business } = await admin
      .from("businesses")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

    const leadId = request.nextUrl.searchParams.get("leadId");
    if (!leadId) return NextResponse.json({ error: "leadId required" }, { status: 400 });

    const { data: events, error } = await admin
      .from("lead_timeline")
      .select("*")
      .eq("lead_id", leadId)
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("[Lead Timeline GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch timeline" }, { status: 500 });
    }

    return NextResponse.json({ events: events || [] });
  } catch (err) {
    console.error("[Lead Timeline GET] Unexpected:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
