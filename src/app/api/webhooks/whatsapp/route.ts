import { NextRequest, NextResponse } from "next/server";
import { processWebhookPayload } from "@/lib/whatsapp/message-handler";
import { validateWebhookSignature, validatePayloadStructure } from "@/lib/whatsapp/webhook-validator";
import type { WebhookPayload } from "@/lib/whatsapp/types";

/**
 * WhatsApp Webhook — Production Ready
 *
 * GET  → Meta verification (returns challenge)
 * POST → Incoming messages/status updates
 *
 * Environment variable required:
 *   WHATSAPP_VERIFY_TOKEN = simple string (e.g. "bizbot_verify_123")
 *   This must EXACTLY match what you enter in Meta Developer Dashboard.
 *   It is NOT the access token (which starts with EAAN...).
 */

// Hardcoded fallback — if env var is wrong (e.g. contains access token), use this
const FALLBACK_VERIFY_TOKEN = "bizbot_verify_123";

function getVerifyToken(): string {
  const envToken = process.env.WHATSAPP_VERIFY_TOKEN || "";
  // If env token looks like an access token (too long), use fallback
  if (envToken.length > 100 || envToken.startsWith("EAAN")) {
    console.warn("[Webhook] WHATSAPP_VERIFY_TOKEN appears to be an access token (too long). Using fallback token.");
    return FALLBACK_VERIFY_TOKEN;
  }
  return envToken.trim() || FALLBACK_VERIFY_TOKEN;
}

/**
 * GET /api/webhooks/whatsapp
 * Meta webhook verification — must return challenge as plain text
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = getVerifyToken();

  console.log("=== WEBHOOK VERIFICATION ===");
  console.log("hub.mode:", mode);
  console.log("hub.verify_token:", token);
  console.log("expected token:", expectedToken);
  console.log("challenge:", challenge);
  console.log("match:", token === expectedToken);
  console.log("============================");

  if (mode === "subscribe" && token === expectedToken) {
    if (challenge) {
      console.log("✓ VERIFICATION SUCCESS — returning challenge");
      // CRITICAL: Return challenge as PLAIN TEXT, not JSON
      return new Response(challenge, {
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }
  }

  console.error("✗ VERIFICATION FAILED");
  if (mode !== "subscribe") console.error("  Reason: mode is not 'subscribe'");
  if (token !== expectedToken) console.error("  Reason: token mismatch");
  if (!challenge) console.error("  Reason: no challenge");

  return new Response("Verification failed", { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Incoming messages from WhatsApp — must return 200 within 5 seconds
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  // Signature validation (if app secret configured)
  const signature = request.headers.get("x-hub-signature-256");
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  if (appSecret && signature) {
    const isValid = validateWebhookSignature(rawBody, signature, appSecret);
    if (!isValid) {
      console.error("[Webhook POST] Invalid signature");
      return new Response("Invalid signature", { status: 401 });
    }
  }

  // Parse payload
  let payload: WebhookPayload;
  try {
    const parsed = JSON.parse(rawBody);
    if (!validatePayloadStructure(parsed)) {
      return new Response("Invalid payload", { status: 400 });
    }
    payload = parsed;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  // Process async (don't block the 200 response)
  processWebhookPayload(payload).catch((error) => {
    console.error("[Webhook POST] Processing error:", error);
  });

  // Return 200 immediately — Meta requires response within 5s
  return new Response("EVENT_RECEIVED", { status: 200 });
}
