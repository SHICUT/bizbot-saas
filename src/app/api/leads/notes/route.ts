import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/leads/notes?leadId=xxx — Fetch notes for a lead
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

    const { data: notes, error } = await admin
      .from("lead_notes")
      .select("*")
      .eq("lead_id", leadId)
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[Lead Notes GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch notes" }, { status: 500 });
    }

    return NextResponse.json({ notes: notes || [] });
  } catch (err) {
    console.error("[Lead Notes GET] Unexpected:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/**
 * POST /api/leads/notes — Add a note to a lead
 */
export async function POST(request: NextRequest) {
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

    const { leadId, note } = await request.json();
    if (!leadId || !note) return NextResponse.json({ error: "leadId and note required" }, { status: 400 });

    // Verify lead belongs to business
    const { data: lead } = await admin
      .from("leads")
      .select("id")
      .eq("id", leadId)
      .eq("business_id", business.id)
      .single();

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const { data: newNote, error } = await admin
      .from("lead_notes")
      .insert({
        business_id: business.id,
        lead_id: leadId,
        note,
        created_by: "owner",
      })
      .select()
      .single();

    if (error) {
      console.error("[Lead Notes POST] Error:", error.message);
      return NextResponse.json({ error: "Failed to add note" }, { status: 500 });
    }

    // Add timeline event
    await admin.from("lead_timeline").insert({
      business_id: business.id,
      lead_id: leadId,
      event_type: "note_added",
      description: note.substring(0, 100),
    });

    return NextResponse.json({ note: newNote }, { status: 201 });
  } catch (err) {
    console.error("[Lead Notes POST] Unexpected:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
