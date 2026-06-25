import { NextRequest } from "next/server";

/**
 * /api/webhook — Alias for /api/webhooks/whatsapp
 *
 * Meta WhatsApp Cloud API sends to this URL.
 * This file re-exports the handlers from the canonical route.
 *
 * Both URLs now work:
 *   https://flownex.in/api/webhook
 *   https://flownex.in/api/webhooks/whatsapp
 */

// Import the actual handlers
import { GET as whatsappGET, POST as whatsappPOST } from "@/app/api/webhooks/whatsapp/route";

export async function GET(request: NextRequest) {
  return whatsappGET(request);
}

export async function POST(request: NextRequest) {
  return whatsappPOST(request);
}
