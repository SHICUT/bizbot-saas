import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/business/whatsapp-signup/callback
 *
 * OAuth callback from Meta Embedded Signup.
 * Meta redirects here with ?code=xxx after user completes the flow.
 * We exchange the code for tokens and save credentials.
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const error = request.nextUrl.searchParams.get("error");
  const errorReason = request.nextUrl.searchParams.get("error_reason");

  if (error) {
    console.error("[WA Callback] User denied:", error, errorReason);
    return new Response(`<html><body><script>window.close();</script><p>Connection cancelled. You can close this window.</p></body></html>`, {
      headers: { "Content-Type": "text/html" },
    });
  }

  if (!code) {
    return new Response(`<html><body><p>No authorization code received.</p><script>window.close();</script></body></html>`, {
      headers: { "Content-Type": "text/html" },
    });
  }

  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/business/whatsapp-signup/callback`;

  if (!appId || !appSecret) {
    return new Response(`<html><body><p>Server misconfigured. Contact support.</p><script>setTimeout(()=>window.close(),3000);</script></body></html>`, {
      headers: { "Content-Type": "text/html" },
    });
  }

  try {
    // Exchange code for access token
    console.log("[WA Callback] Exchanging code for token...");
    const tokenRes = await fetch(
      `https://graph.facebook.com/v23.0/oauth/access_token?client_id=${appId}&client_secret=${appSecret}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    );
    const tokenData = await tokenRes.json();

    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("[WA Callback] Token exchange failed:", tokenData);
      return new Response(`<html><body><p>Failed to connect. Please try again.</p><script>setTimeout(()=>window.close(),3000);</script></body></html>`, {
        headers: { "Content-Type": "text/html" },
      });
    }

    const accessToken = tokenData.access_token;

    // Get user's WABAs
    const wabaRes = await fetch(
      `https://graph.facebook.com/v23.0/me/businesses?fields=id,name,owned_whatsapp_business_accounts{id,name,phone_numbers{id,display_phone_number}}&access_token=${accessToken}`
    );
    const wabaData = await wabaRes.json();

    let wabaId: string | null = null;
    let phoneNumberId: string | null = null;

    if (wabaData.data) {
      for (const biz of wabaData.data) {
        const wabas = biz.owned_whatsapp_business_accounts?.data;
        if (wabas?.length > 0) {
          wabaId = wabas[0].id;
          const phones = wabas[0].phone_numbers?.data;
          if (phones?.length > 0) phoneNumberId = phones[0].id;
          break;
        }
      }
    }

    if (!phoneNumberId) {
      return new Response(`<html><body><p>No WhatsApp number found. Set up a number in Meta Business Suite first.</p><script>setTimeout(()=>window.close(),5000);</script></body></html>`, {
        headers: { "Content-Type": "text/html" },
      });
    }

    // Save to DB — get user from auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      const admin = createAdminClient();
      await admin.from("businesses").update({
        whatsapp_phone_number_id: phoneNumberId,
        whatsapp_business_account_id: wabaId,
        whatsapp_access_token: accessToken,
        whatsapp_connected: true,
        whatsapp_connected_at: new Date().toISOString(),
      }).eq("owner_id", user.id);

      // Subscribe app to WABA webhooks
      if (wabaId) {
        await fetch(`https://graph.facebook.com/v23.0/${wabaId}/subscribed_apps`, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }

      console.log(`[WA Callback] ✓ Connected! WABA: ${wabaId}, Phone: ${phoneNumberId}`);
    }

    return new Response(`<html><body><p>✅ WhatsApp connected successfully! This window will close.</p><script>setTimeout(()=>window.close(),2000);</script></body></html>`, {
      headers: { "Content-Type": "text/html" },
    });
  } catch (err) {
    console.error("[WA Callback] Error:", err);
    return new Response(`<html><body><p>Connection failed. Please try again.</p><script>setTimeout(()=>window.close(),3000);</script></body></html>`, {
      headers: { "Content-Type": "text/html" },
    });
  }
}
