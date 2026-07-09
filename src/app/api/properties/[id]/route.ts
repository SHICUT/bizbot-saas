import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Single Property API — GET, PUT, DELETE
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const { data, error } = await admin.from("properties")
    .select("*").eq("id", id).eq("business_id", business.id).single();

  if (error || !data) return NextResponse.json({ error: "Property not found" }, { status: 404 });
  return NextResponse.json({ property: data });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  // Only update provided fields
  const allowedFields = [
    "name", "tower", "unit_number", "property_type", "bhk",
    "carpet_area", "super_builtup_area", "price_min", "price_max",
    "price_display", "booking_amount", "payment_plans", "status",
    "possession_date", "rera_number", "builder_name", "address",
    "city", "area", "latitude", "longitude", "google_maps_link",
    "images", "floor_plans", "brochure_url", "videos", "amenities",
    "nearby", "highlights", "description", "is_active", "sort_order",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) updates[field] = body[field];
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await admin.from("properties")
    .update(updates).eq("id", id).eq("business_id", business.id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Property not found" }, { status: 404 });

  return NextResponse.json({ property: data });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  // Soft delete
  const { error } = await admin.from("properties")
    .update({ is_active: false }).eq("id", id).eq("business_id", business.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
