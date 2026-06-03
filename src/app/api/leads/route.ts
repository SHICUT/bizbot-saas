import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/leads — Fetch all leads for the business
 * Query params: status, temperature, search, limit, offset
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

    const url = request.nextUrl;
    const status = url.searchParams.get("status");
    const temperature = url.searchParams.get("temperature");
    const search = url.searchParams.get("search");
    const limit = parseInt(url.searchParams.get("limit") || "50");
    const offset = parseInt(url.searchParams.get("offset") || "0");

    let query = admin
      .from("leads")
      .select("*", { count: "exact" })
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== "all") query = query.eq("status", status);
    if (temperature && temperature !== "all") query = query.eq("lead_temperature", temperature);
    if (search) {
      // Sanitize: escape special PostgREST characters
      const sanitized = search.replace(/[%_()]/g, "");
      if (sanitized) {
        query = query.or(`name.ilike.%${sanitized}%,phone.ilike.%${sanitized}%,email.ilike.%${sanitized}%`);
      }
    }

    const { data: leads, error, count } = await query;

    if (error) {
      console.error("[Leads GET] Error:", error.message);
      return NextResponse.json({ error: "Failed to fetch leads" }, { status: 500 });
    }

    // Get pipeline stats — use select("*") to avoid column-not-found errors
    const { data: allLeads } = await admin
      .from("leads")
      .select("*")
      .eq("business_id", business.id);

    const stats = {
      total: allLeads?.length || 0,
      hot: allLeads?.filter((l) => l.lead_temperature === "hot").length || 0,
      warm: allLeads?.filter((l) => l.lead_temperature === "warm").length || 0,
      cold: allLeads?.filter((l) => l.lead_temperature === "cold").length || 0,
      new: allLeads?.filter((l) => l.status === "new").length || 0,
      contacted: allLeads?.filter((l) => l.status === "contacted").length || 0,
      qualified: allLeads?.filter((l) => l.status === "qualified").length || 0,
      converted: allLeads?.filter((l) => l.status === "converted").length || 0,
      lost: allLeads?.filter((l) => l.status === "lost").length || 0,
      totalValue: allLeads?.reduce((sum, l) => sum + (l.estimated_value || 0), 0) || 0,
      avgScore: allLeads?.length ? Math.round((allLeads.reduce((sum, l) => sum + (l.score || 0), 0)) / allLeads.length) : 0,
    };

    return NextResponse.json({ leads: leads || [], stats, total: count || 0 });
  } catch (err) {
    console.error("[Leads GET] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/**
 * POST /api/leads — Create a new lead manually
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

    const body = await request.json();
    const { name, phone, email, source, estimated_value, notes } = body;

    if (!name || !phone) {
      return NextResponse.json({ error: "Name and phone are required" }, { status: 400 });
    }

    // Check for duplicate phone
    const { data: existing } = await admin
      .from("leads")
      .select("id")
      .eq("business_id", business.id)
      .eq("phone", phone)
      .single();

    if (existing) {
      return NextResponse.json({ error: "A lead with this phone number already exists" }, { status: 409 });
    }

    const { data: lead, error } = await admin
      .from("leads")
      .insert({
        business_id: business.id,
        name,
        phone,
        email: email || null,
        source: source || "manual",
        estimated_value: estimated_value || 0,
        status: "new",
        lead_temperature: "warm",
        score: 30,
        message_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("[Leads POST] Error:", error.message);
      return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
    }

    // Add timeline event
    await admin.from("lead_timeline").insert({
      business_id: business.id,
      lead_id: lead.id,
      event_type: "first_contact",
      description: `Lead created manually from ${source || "manual"} source`,
    });

    // Add note if provided
    if (notes) {
      await admin.from("lead_notes").insert({
        business_id: business.id,
        lead_id: lead.id,
        note: notes,
        created_by: "owner",
      });
    }

    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    console.error("[Leads POST] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/**
 * PATCH /api/leads — Update a lead
 */
export async function PATCH(request: NextRequest) {
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

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) return NextResponse.json({ error: "Lead ID required" }, { status: 400 });

    // Only allow updating own leads
    const { data: lead } = await admin
      .from("leads")
      .select("id, status")
      .eq("id", id)
      .eq("business_id", business.id)
      .single();

    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

    const allowedFields = ["name", "email", "status", "lead_temperature", "estimated_value", "score"];
    const safeUpdates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (updates[key] !== undefined) safeUpdates[key] = updates[key];
    }

    if (Object.keys(safeUpdates).length === 0) {
      return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
    }

    const { error } = await admin
      .from("leads")
      .update(safeUpdates)
      .eq("id", id);

    if (error) {
      console.error("[Leads PATCH] Error:", error.message);
      return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
    }

    // Add timeline event for status changes
    if (safeUpdates.status && safeUpdates.status !== lead.status) {
      await admin.from("lead_timeline").insert({
        business_id: business.id,
        lead_id: id,
        event_type: safeUpdates.status === "converted" ? "converted" : "status_change",
        description: `Status changed from ${lead.status} to ${safeUpdates.status}`,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Leads PATCH] Unexpected error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
