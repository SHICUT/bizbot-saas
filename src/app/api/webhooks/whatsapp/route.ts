import { NextRequest, NextResponse } from "next/server";
import {
  verifyWebhookSubscription,
  validateWebhookSignature,
  validatePayloadStructure,
} from "@/lib/whatsapp/webhook-validator";
import { processWebhookPayload } from "@/lib/whatsapp/message-handler";
import type { WebhookPayload } from "@/lib/whatsapp/types";

/**
 * GET /api/webhooks/whatsapp
 *
 * Webhook Verification Endpoint.
 * Meta sends a GET request when you first register the webhook URL.
 * We must respond with the challenge to confirm ownership.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken = (process.env.WHATSAPP_VERIFY_TOKEN || "").trim();

  // Debug logging
  console.log("[Webhook GET] Verification attempt:");
  console.log("[Webhook GET] hub.mode:", mode);
  console.log("[Webhook GET] hub.verify_token received:", JSON.stringify(token));
  console.log("[Webhook GET] WHATSAPP_VERIFY_TOKEN env:", JSON.stringify(verifyToken));
  console.log("[Webhook GET] hub.challenge:", challenge?.substring(0, 20));
  console.log("[Webhook GET] Token match:", token?.trim() === verifyToken);

  if (!verifyToken) {
    console.error("[Webhook GET] WHATSAPP_VERIFY_TOKEN is empty or not set!");
    return NextResponse.json({ error: "Server misconfigured: WHATSAPP_VERIFY_TOKEN not set" }, { status: 500 });
  }

  // Trim both tokens before comparison
  const receivedToken = (token || "").trim();
  const expectedToken = verifyToken;

  if (mode === "subscribe" && receivedToken === expectedToken && challenge) {
    console.log("[Webhook GET] ✓ Verification SUCCESS. Returning challenge.");
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Detailed failure logging
  console.error("[Webhook GET] ✗ Verification FAILED.");
  if (mode !== "subscribe") console.error("[Webhook GET] Reason: mode is not 'subscribe', got:", mode);
  if (receivedToken !== expectedToken) {
    console.error("[Webhook GET] Reason: token mismatch.");
    console.error("[Webhook GET] Received length:", receivedToken.length, "| Expected length:", expectedToken.length);
    // Character-by-character comparison for debugging
    for (let i = 0; i < Math.max(receivedToken.length, expectedToken.length); i++) {
      if (receivedToken[i] !== expectedToken[i]) {
        console.error(`[Webhook GET] First diff at position ${i}: received '${receivedToken[i]}' (${receivedToken.charCodeAt(i)}) vs expected '${expectedToken[i]}' (${expectedToken.charCodeAt(i)})`);
        break;
      }
    }
  }
  if (!challenge) console.error("[Webhook GET] Reason: no challenge provided");

  return NextResponse.json({ error: "Verification failed" }, { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 *
 * Incoming Message Webhook.
 * Meta sends a POST for every message, status update, and error.
 *
 * CRITICAL: Must return 200 within 5 seconds or Meta will retry.
 * We acknowledge immediately and process asynchronously.
 */
export async function POST(request: NextRequest) {
  // 1. Read raw body for signature validation
  const rawBody = await request.text();

  // 2. Validate signature (security: ensures request is from Meta)
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (appSecret) {
    const isValid = validateWebhookSignature(rawBody, signature, appSecret);
    if (!isValid) {
      console.error("[Webhook] Invalid signature — possible spoofing attempt");
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
  } else {
    // In development, log a warning but don't block
    console.warn("[Webhook] WHATSAPP_APP_SECRET not set — skipping signature validation");
  }

  // 3. Parse and validate payload structure
  let payload: WebhookPayload;
  try {
    const parsed = JSON.parse(rawBody);
    if (!validatePayloadStructure(parsed)) {
      return NextResponse.json(
        { error: "Invalid payload structure" },
        { status: 400 }
      );
    }
    payload = parsed;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 }
    );
  }

  // 4. Acknowledge immediately (Meta requires 200 within 5s)
  //    Process the message asynchronously.
  //    In production, this would go to a queue (Redis/BullMQ).
  //    For MVP, we process inline but don't await (fire-and-forget).
  processWebhookPayload(payload).catch((error) => {
    console.error("[Webhook] Processing error:", error);
  });

  // 5. Return 200 immediately
  return NextResponse.json({ status: "received" }, { status: 200 });
}
