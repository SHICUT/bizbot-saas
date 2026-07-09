import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Properties API — CRUD for real estate projects/units
 *
 * GET  → List all properties for the business (with optional filters)
 * POST → Create a new property
 */

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  // Parse filters from query params
  const params = request.nextUrl.searchParams;
  const status = params.get("status");
  const propertyType = params.get("type");
  const bhk = params.get("bhk");
  const city = params.get("city");
  const minPrice = params.get("min_price");
  const maxPrice = params.get("max_price");

  let query = admin.from("properties")
    .select("*")
    .eq("business_id", business.id)
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);
  if (propertyType) query = query.eq("property_type", propertyType);
  if (bhk) query = query.eq("bhk", bhk);
  if (city) query = query.ilike("city", `%${city}%`);
  if (minPrice) query = query.gte("price_min", parseInt(minPrice));
  if (maxPrice) query = query.lte("price_max", parseInt(maxPrice));

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ properties: data || [] });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const body = await request.json();

  // Validate required fields
  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Property name is required" }, { status: 400 });
  }

  const property = {
    business_id: business.id,
    name: String(body.name).trim(),
    tower: body.tower || null,
    unit_number: body.unit_number || null,
    property_type: body.property_type || "flat",
    bhk: body.bhk || null,
    carpet_area: body.carpet_area || null,
    super_builtup_area: body.super_builtup_area || null,
    price_min: body.price_min ? parseInt(body.price_min) : null,
    price_max: body.price_max ? parseInt(body.price_max) : null,
    price_display: body.price_display || null,
    booking_amount: body.booking_amount || null,
    payment_plans: body.payment_plans || [],
    status: body.status || "available",
    possession_date: body.possession_date || null,
    rera_number: body.rera_number || null,
    builder_name: body.builder_name || null,
    address: body.address || null,
    city: body.city || null,
    area: body.area || null,
    latitude: body.latitude ? parseFloat(body.latitude) : null,
    longitude: body.longitude ? parseFloat(body.longitude) : null,
    google_maps_link: body.google_maps_link || null,
    images: body.images || [],
    floor_plans: body.floor_plans || [],
    brochure_url: body.brochure_url || null,
    videos: body.videos || [],
    amenities: body.amenities || [],
    nearby: body.nearby || {},
    highlights: body.highlights || [],
    description: body.description || null,
  };

  const { data, error } = await admin.from("properties").insert(property).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ property: data }, { status: 201 });
}
