import { NextRequest } from "next/server";
import { processWebhookPayload } from "@/lib/whatsapp/message-handler";
import { validateWebhookSignature, validatePayloadStructure } from "@/lib/whatsapp/webhook-validator";
import type { WebhookPayload } from "@/lib/whatsapp/types";

/**
 * /api/webhook — WhatsApp Cloud API Webhook
 *
 * GET  → Health check OR Meta verification
 * POST → Incoming WhatsApp events
 *
 * Compatible with Meta WhatsApp Cloud API production requirements.
 */

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || process.env.META_VERIFY_TOKEN || "flownex_verify_123";

/**
 * GET /api/webhook
 *
 * Two behaviors:
 * 1. No query params → returns "Webhook is running" (health check)
 * 2. Meta verification → validates token, returns challenge
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  // If no verification params → simple health check
  if (!mode && !token && !challenge) {
    return new Response("Webhook is running", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  // Meta verification request
  if (mode === "subscribe" && token === VERIFY_TOKEN && challenge) {
    console.log("[Webhook] ✓ Meta verification success");
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  // Verification failed
  console.error(`[Webhook] ✗ Verification failed | mode=${mode} token=${token} expected=${VERIFY_TOKEN}`);
  return new Response("Forbidden", { status: 403, headers: { "Content-Type": "text/plain" } });
}

/**
 * POST /api/webhook
 *
 * Receives WhatsApp events. Returns 200 immediately.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Signature validation
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.WHATSAPP_APP_SECRET || process.env.META_APP_SECRET;

  if (appSecret && signature) {
    if (!validateWebhookSignature(rawBody, signature, appSecret)) {
      return new Response("Invalid signature", { status: 401 });
    }
  }

  // Parse and process
  let payload: WebhookPayload;
  try {
    const parsed = JSON.parse(rawBody);
    if (!validatePayloadStructure(parsed)) {
      return new Response("OK", { status: 200 });
    }
    payload = parsed;
  } catch {
    return new Response("OK", { status: 200 });
  }

  try {
    await processWebhookPayload(payload);
  } catch (error) {
    console.error("[Webhook POST] Error:", error);
  }

  return new Response("OK", { status: 200 });
}
