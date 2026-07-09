import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens } from "@/lib/integrations/google-calendar";

/**
 * Google OAuth Callback — Exchanges code for tokens and stores them.
 * GET /api/integrations/google/callback?code=xxx&state=business_id
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state"); // business_id
  const error = request.nextUrl.searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL("/settings?gcal=error", request.url));
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL("/settings?gcal=missing", request.url));
  }

  // Verify user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Exchange code for tokens
  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    return NextResponse.redirect(new URL("/settings?gcal=token_error", request.url));
  }

  // Store tokens in business record
  const admin = createAdminClient();
  await admin.from("businesses").update({
    google_calendar_tokens: tokens,
  }).eq("id", state).eq("owner_id", user.id);

  return NextResponse.redirect(new URL("/settings?gcal=connected", request.url));
}
