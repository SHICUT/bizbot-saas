import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const META_API = "https://graph.facebook.com/v23.0";

  // Step A: Validate token
  console.log("[Connect] Validating token for phone_number_id:", phone_number_id, "| WABA:", business_account_id || "not provided");

  const tokenCheckRes = await fetch(`${META_API}/debug_token?input_token=${access_token}&access_token=${access_token}`);
  const tokenCheckData = await tokenCheckRes.json();
  console.log("[Connect] Token check response:", JSON.stringify(tokenCheckData).substring(0, 500));

  // If debug_token fails, try /me as fallback
  if (!tokenCheckRes.ok) {
    const meRes = await fetch(`${META_API}/me`, { headers: { Authorization: `Bearer ${access_token}` } });
    const meData = await meRes.json();
    console.log("[Connect] /me response:", JSON.stringify(meData).substring(0, 300));

    if (!meRes.ok) {
      const errMsg = meData?.error?.message || "Unknown error";
      const errCode = meData?.error?.code;
      console.error("[Connect] Token INVALID:", errMsg, "| Code:", errCode);

      if (errCode === 190) return NextResponse.json({ error: "Access token expired or invalid. Generate a new one from Meta Developer Dashboard.", details: errMsg }, { status: 400 });
      return NextResponse.json({ error: "Access token verification failed.", details: errMsg }, { status: 400 });
    }
    console.log("[Connect] Token valid via /me:", meData.name || meData.id);
  } else {
    console.log("[Connect] Token valid via debug_token");
  }

  // Step B: Validate WABA + Phone Number (if WABA provided)
  if (business_account_id) {
    console.log("[Connect] Validating WABA:", business_account_id, "for phone:", phone_number_id);

    // Use fields=id,name which is always supported
    const wabaRes = await fetch(`${META_API}/${business_account_id}?fields=id,name`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const wabaInfo = await wabaRes.json();
    console.log("[Connect] WABA info response:", JSON.stringify(wabaInfo).substring(0, 300));

    if (!wabaRes.ok) {
      console.warn("[Connect] WABA validation failed:", wabaInfo?.error?.message || "Unknown error");
      // Non-fatal — proceed anyway since token is valid
    } else {
      console.log("[Connect] ✓ WABA verified:", wabaInfo.name || wabaInfo.id);

      // Now try to list phone numbers
      const phonesRes = await fetch(`${META_API}/${business_account_id}/phone_numbers`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const phonesData = await phonesRes.json();
      console.log("[Connect] Phone numbers response:", JSON.stringify(phonesData).substring(0, 500));

      if (phonesRes.ok && phonesData.data) {
        const phoneNumbers = phonesData.data || [];
        console.log("[Connect] Available phones:", phoneNumbers.map((p: Record<string, string>) => `${p.id} (${p.display_phone_number})`).join(", "));
        const phoneMatch = phoneNumbers.find((p: Record<string, string>) => p.id === phone_number_id);
        if (phoneMatch) {
          console.log("[Connect] ✓ Phone number matched:", phoneMatch.display_phone_number);
        } else if (phoneNumbers.length > 0) {
          console.warn("[Connect] Phone ID not in WABA list. Submitted:", phone_number_id, "| Available:", phoneNumbers.map((p: Record<string, string>) => p.id).join(", "));
        }
      }
    }
  } else {
    console.log("[Connect] No WABA ID provided — skipping phone number cross-check");
  }

  // Token is valid — proceed with connection
  console.log("[Connect] ✓ Validation passed. Saving credentials...");

  // Platform-level webhook — all businesses share one webhook URL and verify token
  const platformVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "flownex_verify_123";

  // TEST MODE: Allow same phone_number_id on multiple businesses
  const isTestMode = process.env.ENABLE_MULTI_BUSINESS_WHATSAPP_TESTING === "true";
  if (isTestMode) {
    console.warn("[Connect] ⚠️ TEST MODE ACTIVE: Multi-business WhatsApp mapping enabled. NOT FOR PRODUCTION.");
  }

  // 4. Use admin client to bypass RLS (prevents silent write failures)
  const admin = createAdminClient();

  // Check if phone_number_id is already used by another business (production enforcement)
  if (!isTestMode) {
    const { data: existing } = await admin
      .from("businesses")
      .select("id, name")
      .eq("whatsapp_phone_number_id", phone_number_id)
      .neq("owner_id", user.id)
      .limit(1)
      .single();

    if (existing) {
      console.error(`[Connect] ❌ phone_number_id "${phone_number_id}" already connected to business "${existing.name}" (${existing.id})`);
      return NextResponse.json({ error: "This WhatsApp number is already connected to another business." }, { status: 409 });
    }
  }

  // First get the business ID for this user
  const { data: bizLookup, error: bizLookupErr } = await admin
    .from("businesses")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();

  if (bizLookupErr || !bizLookup) {
    console.error("[Connect] Business not found for user:", user.id, bizLookupErr?.message);
    return NextResponse.json({ error: "Business not found. Complete onboarding first." }, { status: 404 });
  }

  console.log(`[Connect] Found business: ${bizLookup.name} (${bizLookup.id})`);

  // Update with admin client (bypasses RLS, guaranteed write)
  const { error: updateError } = await admin
    .from("businesses")
    .update({
      whatsapp_phone_number_id: phone_number_id,
      whatsapp_business_account_id: business_account_id || null,
      whatsapp_access_token: access_token,
      whatsapp_webhook_verify_token: platformVerifyToken,
      whatsapp_connected: true,
      whatsapp_connected_at: new Date().toISOString(),
    })
    .eq("id", bizLookup.id);

  if (updateError) {
    console.error("[Connect] Failed to update business:", updateError.message);
    return NextResponse.json({ error: "Failed to save credentials: " + updateError.message }, { status: 500 });
  }

  // 5. Verify the write actually persisted
  const { data: verifyBiz } = await admin
    .from("businesses")
    .select("whatsapp_phone_number_id, whatsapp_connected")
    .eq("id", bizLookup.id)
    .single();

  if (!verifyBiz?.whatsapp_phone_number_id || verifyBiz.whatsapp_phone_number_id !== phone_number_id) {
    console.error("[Connect] ❌ Write verification FAILED. phone_number_id not saved:", verifyBiz);
    return NextResponse.json({ error: "Database write failed. Please try again." }, { status: 500 });
  }

  console.log(`[Connect] ✓ Verified: phone_number_id="${verifyBiz.whatsapp_phone_number_id}", connected=${verifyBiz.whatsapp_connected}`);

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://www.flownex.in"}/api/webhooks/whatsapp`;

  return NextResponse.json({
    success: true,
    webhook_url: webhookUrl,
    verify_token: platformVerifyToken,
    message: "WhatsApp connected successfully! Configure the webhook in Meta Developer Dashboard if not already done.",
    instructions: [
      "1. Go to Meta Developer Dashboard → Your App → WhatsApp → Configuration",
      `2. Set Webhook URL to: ${webhookUrl}`,
      `3. Set Verify Token to: ${platformVerifyToken}`,
      "4. Subscribe to 'messages' webhook field",
      "5. You're all set! Messages will be received automatically.",
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

  const admin = createAdminClient();
  const { error } = await admin
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
