import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/webhooks/debug — Temporary diagnostic endpoint
 * Shows webhook configuration status without exposing secrets
 */
export async function GET(request: NextRequest) {
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Simulate webhook verification if params provided
  const mode = request.nextUrl.searchParams.get("hub.mode");
  const token = request.nextUrl.searchParams.get("hub.verify_token");
  const challenge = request.nextUrl.searchParams.get("hub.challenge");

  let verificationTest = null;
  if (mode || token) {
    const receivedTrimmed = (token || "").trim();
    const expectedTrimmed = (verifyToken || "").trim();
    const match = receivedTrimmed === expectedTrimmed;

    verificationTest = {
      hub_mode: mode,
      hub_verify_token_received: token ? `"${token}" (length: ${token.length})` : "null",
      expected_token_preview: verifyToken ? `"${verifyToken.substring(0, 4)}...${verifyToken.substring(verifyToken.length - 4)}" (length: ${verifyToken.length})` : "NOT SET",
      tokens_match: match,
      would_return: match && mode === "subscribe" && challenge ? "200 + challenge" : "403 Verification failed",
      challenge_provided: !!challenge,
    };
  }

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    config: {
      WHATSAPP_VERIFY_TOKEN_exists: !!verifyToken,
      WHATSAPP_VERIFY_TOKEN_length: verifyToken?.length || 0,
      WHATSAPP_VERIFY_TOKEN_preview: verifyToken ? `${verifyToken.substring(0, 5)}...` : "NOT SET",
      WHATSAPP_APP_SECRET_exists: !!appSecret,
      NEXT_PUBLIC_APP_URL: appUrl || "NOT SET",
      webhook_endpoint: "/api/webhooks/whatsapp",
    },
    verification_test: verificationTest,
    instructions: "To test: add ?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123",
  });
}
