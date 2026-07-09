import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { recommendProperties } from "@/lib/ai/property-recommender";

/**
 * Property Recommendation API
 *
 * POST /api/properties/recommend
 * Body: { budget, location, propertyType, bhk, purpose, timeline }
 * Returns: Ranked property matches with percentage scores
 */

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses").select("id").eq("owner_id", user.id).single();
  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  const body = await request.json();
  const requirements = {
    budget: body.budget || undefined,
    location: body.location || undefined,
    propertyType: body.propertyType || body.property_type || undefined,
    bhk: body.bhk || undefined,
    purpose: body.purpose || undefined,
    timeline: body.timeline || undefined,
  };

  const matches = await recommendProperties(business.id, requirements, body.limit || 5);

  return NextResponse.json({ recommendations: matches, total: matches.length });
}
