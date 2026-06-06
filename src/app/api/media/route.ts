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

  const { data: media, error: mediaErr } = await admin
    .from("business_media")
    .select("*")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  console.log(`[Media GET] Business: ${business.id.substring(0, 8)} | Table result: ${media?.length ?? "null"} | Error: ${mediaErr?.message || "none"}`);

  // If table query succeeded and has data, return it
  if (!mediaErr && media && media.length > 0) {
    return NextResponse.json({ media });
  }

  // If table query failed (table doesn't exist) OR returned empty, check JSON fallback
  console.log("[Media GET] Checking JSON fallback...");
  const { data: biz } = await admin.from("businesses").select("business_context, knowledge_json").eq("id", business.id).single();

  let mediaList: unknown[] = [];

  // Check knowledge_json first
  if (biz?.knowledge_json) {
    const kj = biz.knowledge_json as Record<string, unknown>;
    if (Array.isArray(kj.media)) mediaList = kj.media;
  }

  // Then check business_context JSON
  if (mediaList.length === 0 && biz?.business_context?.startsWith("{")) {
    try {
      const ctx = JSON.parse(biz.business_context);
      if (Array.isArray(ctx.media)) mediaList = ctx.media;
    } catch { /* not JSON */ }
  }

  // Combine: table results (if any) + JSON fallback
  const combined = [...(media || []), ...mediaList];
  console.log(`[Media GET] Final: ${combined.length} items (table: ${media?.length || 0}, json: ${mediaList.length})`);

  return NextResponse.json({ media: combined });
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
    console.error("[Media Upload] Insert FAILED:", error.message, "| Code:", error.code);

    // Fallback: store in business_context JSON
    if (error.message.includes("does not exist") || error.message.includes("relation")) {
      console.log("[Media Upload] Table missing — saving to business_context JSON fallback");
      try {
        const { data: biz } = await admin.from("businesses").select("business_context").eq("id", business.id).single();
        let ctx: Record<string, unknown> = {};
        try { if (biz?.business_context?.startsWith("{")) ctx = JSON.parse(biz.business_context); } catch {}
        const mediaList = Array.isArray(ctx.media) ? ctx.media : [];
        mediaList.push({ name, url, type: category || "general", trigger_keywords: trigger_keywords || [], created_at: new Date().toISOString() });
        ctx.media = mediaList;
        await admin.from("businesses").update({ business_context: JSON.stringify(ctx) }).eq("id", business.id);
        console.log("[Media Upload] ✓ Saved to JSON fallback. Total media:", mediaList.length);
        return NextResponse.json({ success: true, id: "json-" + Date.now(), fallback: true });
      } catch (fbErr) {
        console.error("[Media Upload] JSON fallback also failed:", fbErr);
      }

      return NextResponse.json({
        error: "Media table not available. Run migration 013 in Supabase SQL Editor for full media support.",
      }, { status: 500 });
    }

    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
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
