import { NextRequest, NextResponse } from "next/server";
import {
  validateRazorpayWebhook,
  processRazorpayWebhook,
} from "@/lib/payments/razorpay";

/**
 * POST /api/webhooks/razorpay
 *
 * Razorpay Webhook Handler.
 * Receives subscription lifecycle events:
 * - subscription.activated
 * - subscription.charged (recurring payment success)
 * - subscription.pending (payment due)
 * - subscription.halted (payment failed multiple times)
 * - subscription.cancelled
 * - payment.failed
 *
 * Security: Validates HMAC-SHA256 signature using webhook secret.
 */
export async function POST(request: NextRequest) {
  // 1. Read raw body for signature validation
  const rawBody = await request.text();

  // 2. Validate webhook signature
  const signature = request.headers.get("x-razorpay-signature");
  const isValid = validateRazorpayWebhook(rawBody, signature);

  if (!isValid) {
    console.error("[Razorpay Webhook] Invalid signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // 3. Parse event
  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 4. Process the event
  try {
    await processRazorpayWebhook(event);
    console.log(`[Razorpay Webhook] Processed: ${event.event}`);
  } catch (error) {
    console.error(`[Razorpay Webhook] Processing failed:`, error);
    // Still return 200 to prevent Razorpay from retrying
    // (we log the error and can investigate)
  }

  // 5. Always return 200 (Razorpay retries on non-2xx)
  return NextResponse.json({ received: true });
}
