import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/auth/exchange-code
 *
 * Exchanges a PKCE authorization code for a session (server-side).
 * The server has access to the cookie store, so it can set the session cookie.
 *
 * Body: { code: string }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { code } = body;

  if (!code) {
    return NextResponse.json({ error: "Code is required" }, { status: 400 });
  }

  console.log("[ExchangeCode] Exchanging code:", code.substring(0, 20) + "...");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[ExchangeCode] Failed:", error.message, "| Status:", error.status);
    return NextResponse.json({ error: error.message, success: false }, { status: 400 });
  }

  console.log("[ExchangeCode] Success. User:", data.session?.user?.email);
  return NextResponse.json({ success: true, email: data.session?.user?.email });
}
