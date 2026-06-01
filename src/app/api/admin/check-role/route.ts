import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSuperAdmin } from "@/lib/auth/admin-check";

/**
 * GET /api/admin/check-role
 * Returns the user's role. Used by sidebar to show/hide admin links.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ role: null });

  return NextResponse.json({
    role: isSuperAdmin(user.email) ? "super_admin" : "business_owner",
    email: user.email,
  });
}
