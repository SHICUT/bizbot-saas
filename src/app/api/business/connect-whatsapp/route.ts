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

  // 3. Verify the token works by calling the WhatsApp API
  const verifyResponse = await fetch(
    `https://graph.facebook.com/v21.0/${phone_number_id}`,
    {
      headers: { Authorization: `Bearer ${access_token}` },
    }
  );

  if (!verifyResponse.ok) {
    const error = await verifyResponse.json();
    return NextResponse.json(
      {
        error: "Invalid WhatsApp credentials",
        details: error?.error?.message || "Token verification failed",
      },
      { status: 400 }
    );
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
