import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { randomBytes } from "crypto";

/**
 * POST /api/business/connect-whatsapp
 *
 * Connect a WhatsApp Business number to the platform.
 * The owner provides their Meta credentials from the developer dashboard.
 *
 * Body: {
 *   phone_number_id: string,
 *   business_account_id: string,
 *   access_token: string
 * }
 *
 * Security: access_token is stored as-is (in production, encrypt with AES-256).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse and validate body
  const body = await request.json();
  const { phone_number_id, business_account_id, access_token } = body;

  if (!phone_number_id || !access_token) {
    return NextResponse.json(
      { error: "phone_number_id and access_token are required" },
      { status: 400 }
    );
  }

  // 3. Validate credentials using supported Meta API endpoints
  const META_API = "https://graph.facebook.com/v21.0";

  // Step A: Validate token by checking /me (debug_token alternative)
  console.log("[Connect] Validating token...");
  const tokenCheckRes = await fetch(`${META_API}/me?access_token=${access_token}`);
  const tokenCheckData = await tokenCheckRes.json();

  if (!tokenCheckRes.ok) {
    const errMsg = tokenCheckData?.error?.message || "Unknown error";
    const errCode = tokenCheckData?.error?.code;
    console.error("[Connect] Token validation failed:", errMsg, "| Code:", errCode);

    if (errCode === 190) {
      return NextResponse.json({ error: "Access token is expired or invalid. Please generate a new token from Meta Developer Dashboard.", details: errMsg }, { status: 400 });
    }
    if (errMsg.includes("permission")) {
      return NextResponse.json({ error: "Token is missing required permissions. Ensure it has 'whatsapp_business_messaging' permission.", details: errMsg }, { status: 400 });
    }
    return NextResponse.json({ error: "Invalid access token. Please check and try again.", details: errMsg }, { status: 400 });
  }
  console.log("[Connect] Token valid. App/User:", tokenCheckData.name || tokenCheckData.id);

  // Step B: If WABA ID provided, validate it and check phone numbers
  if (business_account_id) {
    console.log("[Connect] Validating WABA:", business_account_id);
    const wabaRes = await fetch(`${META_API}/${business_account_id}/phone_numbers`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const wabaData = await wabaRes.json();

    if (!wabaRes.ok) {
      const errMsg = wabaData?.error?.message || "Unknown error";
      console.error("[Connect] WABA validation failed:", errMsg);
      if (errMsg.includes("does not exist")) {
        return NextResponse.json({ error: "WhatsApp Business Account ID not found. Please verify the ID in Meta Developer Dashboard.", details: errMsg }, { status: 400 });
      }
      return NextResponse.json({ error: "Cannot access WhatsApp Business Account. Check permissions.", details: errMsg }, { status: 400 });
    }

    // Verify phone_number_id exists in this WABA
    const phoneNumbers = wabaData.data || [];
    const phoneMatch = phoneNumbers.find((p: { id: string }) => p.id === phone_number_id);

    if (!phoneMatch && phoneNumbers.length > 0) {
      console.error("[Connect] Phone Number ID mismatch. Available:", phoneNumbers.map((p: { id: string }) => p.id));
      return NextResponse.json({
        error: `Phone Number ID "${phone_number_id}" not found in this Business Account. Available IDs: ${phoneNumbers.map((p: { id: string; display_phone_number?: string }) => `${p.id} (${p.display_phone_number || "unknown"})`).join(", ")}`,
        details: "Phone Number ID does not belong to the provided WABA",
      }, { status: 400 });
    }
    console.log("[Connect] Phone number verified:", phoneMatch?.display_phone_number || phone_number_id);
  } else {
    // No WABA provided — validate phone number via message send capability check
    console.log("[Connect] No WABA ID — validating phone number directly...");
    const phoneRes = await fetch(`${META_API}/${phone_number_id}/whatsapp_business_profile`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!phoneRes.ok) {
      const phoneData = await phoneRes.json();
      const errMsg = phoneData?.error?.message || "Unknown error";
      console.error("[Connect] Phone number validation failed:", errMsg);

      if (errMsg.includes("Unsupported get request")) {
        // Fallback: try messaging capability
        const msgTestRes = await fetch(`${META_API}/${phone_number_id}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${access_token}` },
        });
        if (!msgTestRes.ok) {
          const msgData = await msgTestRes.json();
          return NextResponse.json({
            error: "Phone Number ID could not be verified. Make sure it's a valid WhatsApp Cloud API phone number ID (not the phone number itself).",
            details: msgData?.error?.message || errMsg,
          }, { status: 400 });
        }
      } else {
        return NextResponse.json({ error: "Phone Number ID validation failed.", details: errMsg }, { status: 400 });
      }
    }
    console.log("[Connect] Phone number validated successfully");
  }

  // 4. Generate a webhook verify token
  const webhookVerifyToken = randomBytes(32).toString("hex");

  // 5. Update business with WhatsApp credentials
  const { error: updateError } = await supabase
    .from("businesses")
    .update({
      whatsapp_phone_number_id: phone_number_id,
      whatsapp_business_account_id: business_account_id || null,
      whatsapp_access_token: access_token,
      whatsapp_webhook_verify_token: webhookVerifyToken,
      whatsapp_connected: true,
      whatsapp_connected_at: new Date().toISOString(),
    })
    .eq("owner_id", user.id);

  if (updateError) {
    console.error("[Connect] Failed to update business:", updateError);
    return NextResponse.json(
      { error: "Failed to save credentials" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/whatsapp`,
    verify_token: webhookVerifyToken,
    instructions: [
      "1. Go to Meta Developer Dashboard → Your App → WhatsApp → Configuration",
      "2. Set Webhook URL to the webhook_url above",
      "3. Set Verify Token to the verify_token above",
      "4. Subscribe to 'messages' webhook field",
      "5. Send a test message to your WhatsApp number",
    ],
  });
}

/**
 * DELETE /api/business/connect-whatsapp
 *
 * Disconnect WhatsApp from the business.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function DELETE(_request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      whatsapp_phone_number_id: null,
      whatsapp_business_account_id: null,
      whatsapp_access_token: null,
      whatsapp_webhook_verify_token: null,
      whatsapp_connected: false,
      whatsapp_connected_at: null,
    })
    .eq("owner_id", user.id);

  if (error) {
    return NextResponse.json(
      { error: "Failed to disconnect" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
