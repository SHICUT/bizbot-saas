import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/media — List all media for the business
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ media: [], categories: [] });

  try {
    const { data: media } = await admin
      .from("business_media")
      .select("*")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    return NextResponse.json({ media: media || [] });
  } catch {
    // Table doesn't exist — return empty
    console.warn("[Media GET] business_media table may not exist");
    return NextResponse.json({ media: [] });
  }
}

/**
 * POST /api/media — Upload media (stores URL + metadata)
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("[Media Upload] No authenticated user");
    return NextResponse.json({ error: "Please log in and try again" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: business, error: bizErr } = await admin.from("businesses").select("id").eq("owner_id", user.id).single();

  console.log("[Media Upload] User:", user.id.substring(0, 8));
  console.log("[Media Upload] Business:", business?.id?.substring(0, 8) || "NOT FOUND");

  if (bizErr || !business) {
    console.error("[Media Upload] Business not found:", bizErr?.message);
    return NextResponse.json({ error: "Business not found. Please complete onboarding." }, { status: 404 });
  }

  const body = await request.json();
  const { name, url, category, trigger_keywords } = body;

  console.log("[Media Upload] Payload:", { name, url: url?.substring(0, 50), category, keywords: trigger_keywords?.length });

  if (!name || !url) {
    return NextResponse.json({ error: "Name and URL are required" }, { status: 400 });
  }

  // Try inserting into business_media table
  const insertData = {
    business_id: business.id,
    name,
    type: category || "general",
    url,
    trigger_keywords: trigger_keywords || [],
    is_active: true,
  };

  console.log("[Media Upload] Inserting:", JSON.stringify(insertData).substring(0, 200));

  const { data, error } = await admin.from("business_media").insert(insertData).select("id").single();

  if (error) {
    console.error("[Media Upload] Insert FAILED:", error.message, "| Code:", error.code, "| Details:", error.details);

    // If table doesn't exist, provide clear message
    if (error.message.includes("does not exist") || error.message.includes("relation")) {
      return NextResponse.json({
        error: "Media library table not set up yet. Please run the database migration (migration 013) in Supabase SQL Editor.",
        details: error.message,
      }, { status: 500 });
    }

    return NextResponse.json({ error: `Upload failed: ${error.message}`, details: error.details }, { status: 500 });
  }

  console.log("[Media Upload] ✓ Success! ID:", data.id);
  return NextResponse.json({ success: true, id: data.id });
}

/**
 * DELETE /api/media?id=xxx
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await admin.from("business_media").update({ is_active: false }).eq("id", id).eq("business_id", business.id);
  return NextResponse.json({ success: true });
}
