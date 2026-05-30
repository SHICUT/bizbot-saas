import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /callback
 *
 * Handles all Supabase Auth redirects:
 * - Email verification (after clicking verify link)
 * - Password reset (after clicking reset link)
 * - OAuth callbacks (if enabled in future)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // If there's a "next" param, use it (e.g., /reset-password)
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }
      // Default: redirect to select-plan (for new signups) or dashboard
      return NextResponse.redirect(`${origin}/select-plan`);
    }
  }

  // Failed — redirect to login with error
  return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}
