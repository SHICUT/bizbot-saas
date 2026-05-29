import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { WhatsAppClient } from "@/lib/whatsapp/client";

/**
 * POST /api/messages/send
 *
 * Send a manual message from the dashboard.
 * When the owner sends a message, AI is paused for that lead.
 *
 * Body: { lead_id: string, content: string }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse request body
  const body = await request.json();
  const { lead_id, content } = body;

  if (!lead_id || !content) {
    return NextResponse.json(
      { error: "lead_id and content are required" },
      { status: 400 }
    );
  }

  if (content.length > 4096) {
    return NextResponse.json(
      { error: "Message too long (max 4096 characters)" },
      { status: 400 }
    );
  }

  // 3. Get business (RLS ensures owner can only access their own)
  const { data: business, error: bizError } = await supabase
    .from("businesses")
    .select("id, whatsapp_phone_number_id, whatsapp_access_token, ai_pause_duration")
    .eq("owner_id", user.id)
    .single();

  if (bizError || !business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  if (!business.whatsapp_phone_number_id || !business.whatsapp_access_token) {
    return NextResponse.json(
      { error: "WhatsApp not connected" },
      { status: 400 }
    );
  }

  // 4. Get lead (RLS ensures it belongs to this business)
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .select("id, wa_id, phone")
    .eq("id", lead_id)
    .single();

  if (leadError || !lead) {
    return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  }

  // 5. Get or create conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id")
    .eq("business_id", business.id)
    .eq("lead_id", lead.id)
    .eq("channel", "whatsapp")
    .single();

  if (!conversation) {
    return NextResponse.json(
      { error: "No conversation found" },
      { status: 404 }
    );
  }

  // 6. Send via WhatsApp
  const client = new WhatsAppClient({
    phone_number_id: business.whatsapp_phone_number_id,
    access_token: business.whatsapp_access_token,
    business_id: business.id,
  });

  try {
    const result = await client.sendTextMessage(lead.wa_id, content);
    const waMessageId = result.messages[0]?.id;

    // 7. Store outbound message
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        business_id: business.id,
        conversation_id: conversation.id,
        lead_id: lead.id,
        wa_message_id: waMessageId,
        direction: "outbound",
        content,
        message_type: "text",
        is_ai_generated: false,
        status: "sent",
      })
      .select("id, created_at")
      .single();

    if (msgError) {
      console.error("[Send] Failed to store message:", msgError);
    }

    // 8. Pause AI for this lead (owner is handling it)
    const pauseUntil = new Date(
      Date.now() + (business.ai_pause_duration || 30) * 60 * 1000
    ).toISOString();

    await supabase
      .from("leads")
      .update({ ai_paused_until: pauseUntil })
      .eq("id", lead.id);

    return NextResponse.json({
      success: true,
      message: {
        id: message?.id,
        wa_message_id: waMessageId,
        created_at: message?.created_at,
      },
    });
  } catch (error) {
    console.error("[Send] WhatsApp send failed:", error);
    return NextResponse.json(
      { error: "Failed to send message" },
      { status: 500 }
    );
  }
}
