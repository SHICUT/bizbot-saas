import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/auth/me
 * Returns the current authenticated user and their business.
 * Protected by middleware (unauthenticated requests never reach here).
 */
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Fetch the user's business (RLS ensures they only see their own)
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("id, name, type, plan, whatsapp_connected, ai_enabled, onboarding_completed")
    .eq("owner_id", user.id)
    .single();

  if (bizError) {
    return NextResponse.json(
      { error: "Business not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.email,
      created_at: user.created_at,
    },
    business,
  });
}
