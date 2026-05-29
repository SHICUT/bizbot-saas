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

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  if (!verifyToken) {
    console.error("[Webhook] WHATSAPP_VERIFY_TOKEN not configured");
    return NextResponse.json(
      { error: "Server misconfigured" },
      { status: 500 }
    );
  }

  const result = verifyWebhookSubscription(mode, token, challenge, verifyToken);

  if (result.valid && result.challenge) {
    // Must return the challenge as plain text (not JSON)
    return new NextResponse(result.challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

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
