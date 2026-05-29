import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { processInstagramWebhook } from "@/lib/instagram/message-handler";
import type { IGWebhookPayload } from "@/lib/instagram/types";

/**
 * GET /api/webhooks/instagram
 *
 * Webhook verification — same pattern as WhatsApp.
 * Meta sends this when registering the webhook URL.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = process.env.INSTAGRAM_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    return NextResponse.json({ error: "Verify token not configured" }, { status: 500 });
  }

  if (mode === "subscribe" && token === verifyToken) {
    return new NextResponse(challenge || "", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST /api/webhooks/instagram
 *
 * Incoming Instagram DM webhook.
 * Validates signature, then processes messages.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Validate signature
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.WHATSAPP_APP_SECRET; // Same Meta app secret

  if (appSecret && signature) {
    const expected = "sha256=" + createHmac("sha256", appSecret).update(rawBody).digest("hex");
    if (signature !== expected) {
      console.error("[Instagram Webhook] Invalid signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  // Parse payload
  let payload: IGWebhookPayload;
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed.object !== "instagram") {
      return NextResponse.json({ error: "Not an Instagram webhook" }, { status: 400 });
    }
    payload = parsed;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Process asynchronously (return 200 immediately)
  processInstagramWebhook(payload).catch((error) => {
    console.error("[Instagram Webhook] Processing error:", error);
  });

  return NextResponse.json({ status: "received" });
}
