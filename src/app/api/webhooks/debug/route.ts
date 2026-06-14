import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/webhooks/debug
 *
 * Diagnostic endpoint to verify:
 * 1. Which code version is deployed
 * 2. Whether businesses have phone_number_id saved
 * 3. Whether the webhook lookup would succeed
 */
export async function GET() {
  const BUILD_VERSION = "2026-06-14-v2"; // Update this to confirm deployment
  const supabase = createAdminClient();

  // Get all businesses and their WhatsApp connection status
  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("id, name, whatsapp_phone_number_id, whatsapp_connected, whatsapp_connected_at, is_active, owner_id")
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({
      version: BUILD_VERSION,
      error: "DB query failed: " + error.message,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) + "...",
      service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    });
  }

  const summary = {
    version: BUILD_VERSION,
    timestamp: new Date().toISOString(),
    env: {
      app_url: process.env.NEXT_PUBLIC_APP_URL || "NOT SET",
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 40) || "NOT SET",
      service_key_set: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      verify_token: process.env.WHATSAPP_VERIFY_TOKEN || "NOT SET (using fallback)",
      groq_key_set: !!process.env.GROQ_API_KEY,
      gemini_key_set: !!process.env.GEMINI_API_KEY,
    },
    businesses: businesses?.map((b) => ({
      id: b.id.substring(0, 8) + "...",
      name: b.name,
      phone_number_id: b.whatsapp_phone_number_id || "❌ NULL",
      connected: b.whatsapp_connected,
      connected_at: b.whatsapp_connected_at || "never",
      active: b.is_active,
    })) || [],
    total_businesses: businesses?.length || 0,
    connected_count: businesses?.filter((b) => b.whatsapp_connected && b.whatsapp_phone_number_id).length || 0,
    unlinked_count: businesses?.filter((b) => !b.whatsapp_phone_number_id).length || 0,
    diagnosis: "",
  };

  // Diagnosis
  if (summary.connected_count === 0) {
    summary.diagnosis = "NO businesses have whatsapp_phone_number_id set. Users need to reconnect via Settings → Connect WhatsApp. The connect API now uses admin client (fixed in this deployment).";
  } else {
    summary.diagnosis = `${summary.connected_count} business(es) connected. Webhook should find them by phone_number_id.`;
  }

  return NextResponse.json(summary);
}
