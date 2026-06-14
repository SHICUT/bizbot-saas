import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/test/delivery-status
 *
 * Shows recent outbound message delivery status.
 * Helps diagnose: "Meta accepted but recipient didn't get it"
 *
 * Common failure reasons:
 * - App in Development mode (only test numbers receive messages)
 * - 24h session window expired (need template for business-initiated)
 * - Recipient not in test contacts list
 * - Access token doesn't have send permission
 * - Phone number not registered/verified in Meta
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  const { data: business } = await admin
    .from("businesses")
    .select("id, name, whatsapp_phone_number_id, whatsapp_phone_number, whatsapp_verified_name")
    .eq("owner_id", user.id)
    .single();

  if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

  // Get last 20 outbound messages with their delivery status
  const { data: messages } = await admin
    .from("messages")
    .select("wa_message_id, content, status, error_message, created_at, is_ai_generated")
    .eq("business_id", business.id)
    .eq("direction", "outbound")
    .order("created_at", { ascending: false })
    .limit(20);

  // Delivery stats
  const stats = {
    total: messages?.length || 0,
    sent: messages?.filter((m) => m.status === "sent").length || 0,
    delivered: messages?.filter((m) => m.status === "delivered").length || 0,
    read: messages?.filter((m) => m.status === "read").length || 0,
    failed: messages?.filter((m) => m.status === "failed").length || 0,
    pending: messages?.filter((m) => m.status === "pending").length || 0,
  };

  // Diagnosis
  let diagnosis = "";
  if (stats.total === 0) {
    diagnosis = "No outbound messages found. The AI hasn't sent any replies yet.";
  } else if (stats.failed > 0) {
    const failedMsg = messages?.find((m) => m.status === "failed");
    diagnosis = `${stats.failed} message(s) FAILED. Error: ${failedMsg?.error_message || "Unknown"}. Check Meta app permissions and Business verification.`;
  } else if (stats.delivered === 0 && stats.sent > 0) {
    diagnosis = `Messages accepted by Meta (status=sent) but NOT delivered. Most likely causes:\n` +
      `1. Meta App is in DEVELOPMENT MODE — only numbers in "Test Numbers" list receive messages.\n` +
      `2. The 24-hour messaging window expired — need a Message Template for business-initiated messages.\n` +
      `3. Recipient phone number format is incorrect.\n` +
      `FIX: Go to Meta Developer Dashboard → Your App → switch to LIVE mode, or add the recipient to test numbers.`;
  } else if (stats.delivered > 0) {
    diagnosis = `Messages are being delivered successfully. ${stats.read} have been read.`;
  } else {
    diagnosis = `Status: ${stats.sent} sent, waiting for delivery confirmation from Meta.`;
  }

  return NextResponse.json({
    business: {
      name: business.name,
      phone_number_id: business.whatsapp_phone_number_id,
      display_number: business.whatsapp_phone_number,
      verified_name: business.whatsapp_verified_name,
    },
    delivery_stats: stats,
    diagnosis,
    recent_messages: messages?.map((m) => ({
      id: m.wa_message_id?.substring(0, 20),
      content: m.content?.substring(0, 60) + (m.content?.length > 60 ? "..." : ""),
      status: m.status,
      error: m.error_message || null,
      ai: m.is_ai_generated,
      sent_at: m.created_at,
    })) || [],
    meta_app_checklist: {
      "1_app_mode": "Must be LIVE (not Development) for real delivery",
      "2_messaging_permission": "WhatsApp > API Setup > ensure 'messages' permission granted",
      "3_business_verification": "Settings > Basic > Business Verification must be complete",
      "4_24h_window": "Reply must be within 24h of customer's last message (session message)",
      "5_test_numbers": "In Development mode, recipient must be in 'To' test numbers list",
    },
  });
}
