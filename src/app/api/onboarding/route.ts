import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/onboarding
 * Saves onboarding step data.
 *
 * Body: { step: number, data: Record<string, unknown> }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { step, data } = body;

  const adminSupabase = createAdminClient();

  const { data: business } = await adminSupabase
    .from("businesses")
    .select("id")
    .eq("owner_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "Business not found" }, { status: 404 });

  // Build update based on step
  const updates: Record<string, unknown> = { onboarding_step: step };

  switch (step) {
    case 1: // Business Type
      if (data.type) updates.type = data.type;
      break;
    case 2: // Business Profile
      if (data.name) updates.name = data.name;
      if (data.description) updates.description = data.description;
      if (data.website) updates.website = data.website;
      if (data.address) updates.address = data.address;
      break;
    case 3: // Services
      if (data.services) updates.services = data.services;
      break;
    case 4: // Business Hours
      if (data.business_hours) updates.business_hours = data.business_hours;
      break;
    case 5: // Lead Collection
      if (data.lead_collection) updates.lead_collection = data.lead_collection;
      break;
    case 6: // AI Personality
      if (data.ai_personality) updates.ai_personality = data.ai_personality;
      if (data.ai_tone) updates.ai_tone = data.ai_tone;
      break;
    case 7: // WhatsApp (optional)
      if (data.skip) break;
      if (data.phone_number_id) updates.whatsapp_phone_number_id = data.phone_number_id;
      if (data.business_account_id) updates.whatsapp_business_account_id = data.business_account_id;
      if (data.access_token) updates.whatsapp_access_token = data.access_token;
      updates.whatsapp_connected = true;
      updates.whatsapp_connected_at = new Date().toISOString();
      break;
    case 8: // Complete
      updates.onboarding_completed = true;
      break;
  }

  const { error } = await adminSupabase
    .from("businesses")
    .update(updates)
    .eq("id", business.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, step });
}

/**
 * GET /api/onboarding
 * Returns current onboarding state.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminSupabase = createAdminClient();
  const { data: business } = await adminSupabase
    .from("businesses")
    .select("id, name, type, description, services, business_hours, ai_personality, lead_collection, onboarding_completed, onboarding_step, whatsapp_connected")
    .eq("owner_id", user.id)
    .single();

  return NextResponse.json({
    user: { name: user.user_metadata?.full_name || "", email: user.email },
    business: business || null,
    onboarding_completed: business?.onboarding_completed || false,
    current_step: business?.onboarding_step || 0,
  });
}
