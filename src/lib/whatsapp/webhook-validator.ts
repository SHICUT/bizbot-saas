import { createHmac } from "crypto";
import type { WebhookPayload } from "./types";

/**
 * WhatsApp Webhook Security Validator
 *
 * Validates:
 * 1. Webhook verification (GET request from Meta)
 * 2. Payload signature (POST request authenticity)
 * 3. Payload structure (prevents malformed data processing)
 */

/**
 * Verify the webhook subscription (GET request from Meta).
 * Meta sends this when you first register the webhook URL.
 *
 * @param mode - hub.mode query param (should be "subscribe")
 * @param token - hub.verify_token query param (should match our secret)
 * @param challenge - hub.challenge query param (return this to confirm)
 */
export function verifyWebhookSubscription(
  mode: string | null,
  token: string | null,
  challenge: string | null,
  expectedToken: string
): { valid: boolean; challenge?: string } {
  if (mode === "subscribe" && token === expectedToken) {
    return { valid: true, challenge: challenge || undefined };
  }
  return { valid: false };
}

/**
 * Validate the webhook payload signature (X-Hub-Signature-256 header).
 * This ensures the request actually came from Meta, not an attacker.
 *
 * Meta signs every webhook payload with your app secret using HMAC-SHA256.
 *
 * @param payload - Raw request body as string
 * @param signature - X-Hub-Signature-256 header value
 * @param appSecret - Your Meta App Secret
 */
export function validateWebhookSignature(
  payload: string,
  signature: string | null,
  appSecret: string
): boolean {
  if (!signature) return false;

  const expectedSignature =
    "sha256=" +
    createHmac("sha256", appSecret).update(payload).digest("hex");

  // Constant-time comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return false;

  let result = 0;
  for (let i = 0; i < signature.length; i++) {
    result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Validate the webhook payload structure.
 * Ensures we don't process malformed data that could crash the system.
 */
export function validatePayloadStructure(
  body: unknown
): body is WebhookPayload {
  if (!body || typeof body !== "object") return false;

  const payload = body as Record<string, unknown>;

  if (payload.object !== "whatsapp_business_account") return false;
  if (!Array.isArray(payload.entry)) return false;
  if (payload.entry.length === 0) return false;

  // Validate first entry has changes
  const firstEntry = payload.entry[0] as Record<string, unknown>;
  if (!firstEntry || !Array.isArray(firstEntry.changes)) return false;

  return true;
}

/**
 * Extract the phone_number_id from the webhook payload.
 * Used to route the message to the correct business.
 */
export function extractPhoneNumberId(payload: WebhookPayload): string | null {
  try {
    return payload.entry[0]?.changes[0]?.value?.metadata?.phone_number_id || null;
  } catch {
    return null;
  }
}
