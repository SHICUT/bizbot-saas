import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPipelineSummary, moveLeadToStage, PIPELINE_STAGES } from "@/lib/crm/pipeline";

/**
 * CRM Pipeline API
 *
 * GET  — Pipeline summary (stage counts + values) + leads per stage
 * POST — Move a lead to a new stage
 */

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const stageFilter = request.nextUrl.searchParams.get("stage");
  const search = request.nextUrl.searchParams.get("search");

  // Get summary
  const summary = await getPipelineSummary(business.id);

  // Get leads for a specific stage (or all)
  let query = admin.from("leads")
    .select("id, name, phone, email, status, score, lead_temperature, metadata, source, created_at, last_message_at")
    .eq("business_id", business.id)
    .order("last_message_at", { ascending: false });

  if (stageFilter) query = query.eq("status", stageFilter);
  if (search) query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);

  const { data: leads } = await query.limit(100);

  return NextResponse.json({
    stages: PIPELINE_STAGES,
    summary,
    leads: leads || [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const body = await request.json();
  const { leadId, stage, reason } = body;

  if (!leadId || !stage) {
    return NextResponse.json({ error: "leadId and stage are required" }, { status: 400 });
  }

  const result = await moveLeadToStage(business.id, leadId, stage, "manual", reason);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ moved: true, fromStage: result.fromStage, toStage: result.toStage });
}
