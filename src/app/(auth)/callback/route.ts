import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /callback
 *
 * Handles Supabase Auth redirects:
 * - Email verification: /callback?code=xxx
 * - Password reset: /callback?code=xxx (type=recovery in the session)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Check if this is a password recovery flow
      // Supabase sets the session type when exchanging a recovery code
      if (data.session.user?.recovery_sent_at) {
        const recoverySentAt = new Date(data.session.user.recovery_sent_at).getTime();
        const now = Date.now();
        // If recovery was sent within the last hour, redirect to reset page
        if (now - recoverySentAt < 60 * 60 * 1000) {
          return NextResponse.redirect(`${origin}/reset-password`);
        }
      }

      // If there's a "next" param, use it
      if (next) {
        return NextResponse.redirect(`${origin}${next}`);
      }

      // Default: go to dashboard
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=verification_failed`);
}
