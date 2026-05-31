import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /callback
 *
 * Supabase redirects here after email verification or password reset.
 * The code is exchanged SERVER-SIDE (has access to cookie store for PKCE verifier).
 * Then redirects to the appropriate page.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") || "/";

  console.log("[Callback] Received. code:", code ? "yes" : "no", "| next:", next);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[Callback] Exchange failed:", error.message);
      return NextResponse.redirect(`${origin}/login?error=link_expired`);
    }

    console.log("[Callback] Exchange success. Redirecting to:", next);
    return NextResponse.redirect(`${origin}${next}`);
  }

  console.log("[Callback] No code. Redirecting to login.");
  return NextResponse.redirect(`${origin}/login?error=no_code`);
}
