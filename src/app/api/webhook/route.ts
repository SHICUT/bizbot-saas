import { NextRequest } from "next/server";
import { processWebhookPayload } from "@/lib/whatsapp/message-handler";
import { validateWebhookSignature, validatePayloadStructure } from "@/lib/whatsapp/webhook-validator";
import type { WebhookPayload } from "@/lib/whatsapp/types";

/**
 * /api/webhook — WhatsApp Cloud API Webhook
 *
 * GET  → Health check OR Meta verification
 * POST → Incoming WhatsApp events
 */

function getVerifyToken(): string {
  const token = process.env.META_VERIFY_TOKEN || process.env.WHATSAPP_VERIFY_TOKEN || "";
  if (!token) return "__NOT_CONFIGURED__";
  return token.trim();
}

/**
 * GET /api/webhook
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

  const expectedToken = getVerifyToken();

  // Log every verification attempt for debugging
  console.log("=== WEBHOOK VERIFICATION ===");
  console.log("hub.mode:", JSON.stringify(mode));
  console.log("hub.verify_token:", JSON.stringify(token));
  console.log("expected token:", JSON.stringify(expectedToken));
  console.log("hub.challenge:", JSON.stringify(challenge));
  console.log("ENV META_VERIFY_TOKEN:", JSON.stringify(process.env.META_VERIFY_TOKEN || "NOT SET"));
  console.log("ENV WHATSAPP_VERIFY_TOKEN:", JSON.stringify(process.env.WHATSAPP_VERIFY_TOKEN || "NOT SET"));
  console.log("match:", token === expectedToken);
  console.log("============================");

  // If no verification params → simple health check
  if (!mode && !token && !challenge) {
    return new Response("Webhook is running", { status: 200, headers: { "Content-Type": "text/plain" } });
  }

  // Meta verification request
  if (mode === "subscribe" && token === expectedToken && challenge) {
    console.log("✓ VERIFICATION SUCCESS — returning challenge as-is");
    // Return challenge EXACTLY as received — no encoding, no JSON, no modification
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  // Verification failed — log details
  console.error("✗ VERIFICATION FAILED");
  if (mode !== "subscribe") console.error("  Reason: hub.mode is not 'subscribe', got:", mode);
  if (token !== expectedToken) {
    console.error("  Reason: TOKEN MISMATCH");
    console.error(`  Received: "${token}" (length: ${token?.length})`);
    console.error(`  Expected: "${expectedToken}" (length: ${expectedToken.length})`);
    console.error(`  Char comparison:`, [...(token || "")].map((c, i) => c === expectedToken[i] ? "✓" : `✗(${c.charCodeAt(0)} vs ${expectedToken.charCodeAt(i)})`).join(""));
  }
  if (!challenge) console.error("  Reason: hub.challenge is missing");

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
