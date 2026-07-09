import { NextRequest, NextResponse } from "next/server";
import { processWebhookPayload } from "@/lib/whatsapp/message-handler";
import { validateWebhookSignature, validatePayloadStructure } from "@/lib/whatsapp/webhook-validator";
import { checkRateLimit, RATE_LIMITS, getClientIdentifier } from "@/lib/security/rate-limiter";
import type { WebhookPayload } from "@/lib/whatsapp/types";

/**
 * WhatsApp Webhook — Production Ready
 *
 * GET  → Meta verification (returns challenge)
 * POST → Incoming messages/status updates
 *
 * Environment variable required:
 *   WHATSAPP_VERIFY_TOKEN = simple string (e.g. "FlowNex_verify_123")
 *   This must EXACTLY match what you enter in Meta Developer Dashboard.
 *   It is NOT the access token (which starts with EAAN...).
 */

// Hardcoded fallback REMOVED for production security.
// WHATSAPP_VERIFY_TOKEN must be set in environment variables.

// Startup config validation (logs once when module loads)
(() => {
  const vt = process.env.WHATSAPP_VERIFY_TOKEN || "";
  if (!vt) console.error("[Webhook Config] 🔴 WHATSAPP_VERIFY_TOKEN not set — webhook verification will FAIL. Set it in Vercel env vars.");
  else if (vt.startsWith("EAAN") || vt.length > 100) console.error(`[Webhook Config] 🔴 WRONG VALUE! WHATSAPP_VERIFY_TOKEN is "${vt.substring(0, 15)}..." (${vt.length} chars). This is an ACCESS TOKEN, not a verify token!`);
  else console.log(`[Webhook Config] ✓ WHATSAPP_VERIFY_TOKEN configured (length: ${vt.length})`);

  const as = process.env.WHATSAPP_APP_SECRET;
  if (!as) console.warn("[Webhook Config] ⚠ WHATSAPP_APP_SECRET not set — signature validation disabled");
  else console.log("[Webhook Config] ✓ WHATSAPP_APP_SECRET configured");
})();

function getVerifyToken(): string {
  const envToken = (process.env.WHATSAPP_VERIFY_TOKEN || "").trim();
  if (!envToken) {
    console.error("[Webhook] WHATSAPP_VERIFY_TOKEN not set. Verification will fail.");
    return "__NOT_CONFIGURED__";
  }
  if (envToken.length > 100 || envToken.startsWith("EAAN")) {
    console.error("[Webhook] WHATSAPP_VERIFY_TOKEN appears to be an access token. Verification will fail.");
    return "__MISCONFIGURED__";
  }
  return envToken;
}

/**
 * GET /api/webhooks/whatsapp
 * Meta webhook verification — must return challenge as plain text
 *
 * Meta sends: GET ?hub.mode=subscribe&hub.verify_token=xxx&hub.challenge=yyy
 * We must return exactly hub.challenge as plain text with HTTP 200.
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = getVerifyToken();

  // Detailed logging for production debugging
  console.log("=== WhatsApp Webhook Verification ===");
  console.log("URL:", request.url);
  console.log("hub.mode:", mode);
  console.log("hub.verify_token received:", token);
  console.log("hub.verify_token expected:", expectedToken);
  console.log("hub.challenge:", challenge);
  console.log("token match:", token === expectedToken);
  console.log("=====================================");

  // Meta requires: mode=subscribe, token matches, challenge present
  if (mode === "subscribe" && challenge && token === expectedToken) {
    console.log("✓ Verification SUCCESS — returning challenge");
    // Must return plain text, not JSON
    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "X-Webhook-Verified": "true",
      },
    });
  }

  // Log failure reason clearly
  console.error("✗ Verification FAILED");
  if (mode !== "subscribe") {
    console.error(`  Reason: hub.mode="${mode}" — expected "subscribe"`);
  }
  if (token !== expectedToken) {
    console.error(`  Reason: token mismatch — got "${token}", expected "${expectedToken}"`);
    console.error(`  Fix: In Vercel Dashboard → Environment Variables → set WHATSAPP_VERIFY_TOKEN = "${expectedToken}"`);
    console.error(`  Fix: In Meta Dashboard → Webhooks → Verify Token = "${expectedToken}"`);
  }
  if (!challenge) {
    console.error("  Reason: hub.challenge is missing");
  }

  return new Response("Verification failed", { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * Incoming messages from WhatsApp — must return 200 within 5 seconds
 */
export async function POST(request: NextRequest) {
  // Rate limit webhook to prevent flood attacks (200/min per IP)
  const clientIp = getClientIdentifier(request);
  const rateCheck = checkRateLimit(`webhook:${clientIp}`, RATE_LIMITS.webhook);
  if (!rateCheck.allowed) {
    return new Response("Rate limited", { status: 429 });
  }

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
    console.log("[Webhook POST] Payload received:", JSON.stringify(parsed).substring(0, 500));

    if (!validatePayloadStructure(parsed)) {
      console.error("[Webhook POST] Invalid payload structure");
      return new Response("Invalid payload", { status: 400 });
    }
    payload = parsed;
  } catch {
    console.error("[Webhook POST] Invalid JSON body");
    return new Response("Invalid JSON", { status: 400 });
  }

  // 4. Process the message BEFORE responding
  // On Vercel serverless, fire-and-forget can be killed before completion.
  // We must process synchronously within the function timeout (5min max).
  try {
    await processWebhookPayload(payload);
    console.log("[Webhook POST] ✓ Processing complete");
  } catch (error) {
    console.error("[Webhook POST] Processing error:", error);
  }

  // 5. Return 200
  return new Response("EVENT_RECEIVED", { status: 200 });
}
