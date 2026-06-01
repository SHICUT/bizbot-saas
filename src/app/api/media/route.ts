import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CATEGORIES = ["pricing", "membership", "services", "menu", "offers", "brochure", "gallery", "faq"];

/**
 * GET /api/media — List all media for the business
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: business } = await adminSupabase.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const { data: media } = await adminSupabase
    .from("business_media")
    .select("*")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  return NextResponse.json({ media: media || [], categories: CATEGORIES });
}

/**
 * POST /api/media — Upload media (stores URL, not file)
 * Body: { name, type, url, category, trigger_keywords[] }
 *
 * For actual file upload, use Supabase Storage directly from frontend.
 * This API stores the metadata + URL reference.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: business } = await adminSupabase.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const body = await request.json();
  const { name, type, url, category, trigger_keywords } = body;

  if (!name || !url || !type) {
    return NextResponse.json({ error: "name, url, and type are required" }, { status: 400 });
  }

  const { data, error } = await adminSupabase.from("business_media").insert({
    business_id: business.id,
    name,
    type: category || type,
    url,
    trigger_keywords: trigger_keywords || [],
    is_active: true,
  }).select("id").single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, id: data.id });
}

/**
 * DELETE /api/media?id=xxx — Delete media
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: business } = await adminSupabase.from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  await adminSupabase.from("business_media").update({ is_active: false }).eq("id", id).eq("business_id", business.id);
  return NextResponse.json({ success: true });
}
