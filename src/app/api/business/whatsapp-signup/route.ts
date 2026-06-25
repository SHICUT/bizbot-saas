import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * POST /api/business/whatsapp-signup
 *
 * Handles the callback from Meta Embedded Signup.
 * After the customer completes the Facebook Login + WhatsApp setup flow,
 * Meta returns a code that we exchange for credentials.
 *
 * Body: { code: string } — The authorization code from Meta OAuth
 *
 * Flow:
 * 1. Exchange code for access token
 * 2. Get WABA ID and Phone Number ID from the token
 * 3. Subscribe the app to the WABA webhooks
 * 4. Save credentials to the business
 * 5. Mark WhatsApp as connected
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { code } = await request.json();
  if (!code) return NextResponse.json({ error: "Authorization code required" }, { status: 400 });

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/business/whatsapp-signup/callback`;

  if (!appId || !appSecret) {
    return NextResponse.json({ error: "Meta App not configured. Contact support." }, { status: 500 });
  }

  try {
    // Step 1: Exchange code for user access token
    console.log("[Embedded Signup] Exchanging code for token...");
    const tokenRes = await fetch(
      `https://graph.facebook.com/v23.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`,
      { method: "GET" }
    );
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[Embedded Signup] Token exchange failed:", tokenData);
      return NextResponse.json({ error: "Failed to get access token from Meta", details: tokenData.error?.message }, { status: 400 });
    }

    const userAccessToken = tokenData.access_token;
    console.log("[Embedded Signup] ✓ Got user access token");

    // Step 2: Get the shared WABA IDs (from the embedded signup response)
    console.log("[Embedded Signup] Fetching shared WABAs...");
    const debugRes = await fetch(
      `https://graph.facebook.com/v23.0/debug_token?input_token=${userAccessToken}&access_token=${appId}|${appSecret}`
    );
    const debugData = await debugRes.json();
    console.log("[Embedded Signup] Debug token data:", JSON.stringify(debugData).substring(0, 500));

    // Step 3: Get WABA from the user's business portfolio
    const wabaRes = await fetch(
      `https://graph.facebook.com/v23.0/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number,verified_name}}&access_token=${userAccessToken}`
    );
    const wabaData = await wabaRes.json();
    console.log("[Embedded Signup] Business data:", JSON.stringify(wabaData).substring(0, 800));

    // Extract WABA and phone number from the response
    let wabaId: string | null = null;
    let phoneNumberId: string | null = null;
    let displayPhone: string | null = null;

    if (wabaData.data) {
      for (const biz of wabaData.data) {
        const wabas = biz.owned_whatsapp_business_accounts?.data;
        if (wabas && wabas.length > 0) {
          wabaId = wabas[0].id;
          const phones = wabas[0].phone_numbers?.data;
          if (phones && phones.length > 0) {
            phoneNumberId = phones[0].id;
            displayPhone = phones[0].display_phone_number;
          }
          break;
        }
      }
    }

    if (!wabaId || !phoneNumberId) {
      console.error("[Embedded Signup] Could not find WABA/Phone in response");
      return NextResponse.json({
        error: "Could not find WhatsApp Business Account. Please ensure you've set up a WhatsApp number in Meta Business Suite.",
        debug: { hasWABA: !!wabaId, hasPhone: !!phoneNumberId },
      }, { status: 400 });
    }

    console.log(`[Embedded Signup] ✓ WABA: ${wabaId} | Phone: ${phoneNumberId} (${displayPhone})`);

    // Step 4: Subscribe the app to WABA webhooks
    const subscribeRes = await fetch(
      `https://graph.facebook.com/v23.0/${wabaId}/subscribed_apps`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${userAccessToken}` },
      }
    );
    const subscribeData = await subscribeRes.json();
    console.log("[Embedded Signup] Subscribe response:", JSON.stringify(subscribeData));

    // Step 5: Save to database (with all fields for admin visibility)
    const admin = createAdminClient();
    const { error: updateErr } = await admin
      .from("businesses")
      .update({
        whatsapp_phone_number_id: phoneNumberId,
        whatsapp_phone_number: displayPhone,
        whatsapp_verified_name: displayPhone, // Will be updated with actual verified name
        whatsapp_business_account_id: wabaId,
        whatsapp_access_token: userAccessToken,
        whatsapp_connected: true,
        whatsapp_connected_at: new Date().toISOString(),
        owner_email: user.email || null,
      })
      .eq("owner_id", user.id);

    if (updateErr) {
      console.error("[Embedded Signup] DB save failed:", updateErr);
      return NextResponse.json({ error: "Failed to save credentials" }, { status: 500 });
    }

    console.log("[Embedded Signup] ✓ WhatsApp connected successfully");

    return NextResponse.json({
      success: true,
      phone_number: displayPhone,
      waba_id: wabaId,
      phone_number_id: phoneNumberId,
      message: `WhatsApp connected! Phone: ${displayPhone}`,
    });
  } catch (err) {
    console.error("[Embedded Signup] Error:", err);
    return NextResponse.json({ error: "Connection failed. Please try again." }, { status: 500 });
  }
}
