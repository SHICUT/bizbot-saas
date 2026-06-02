import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "@/lib/whatsapp/client";

/**
 * GET /api/broadcasts — List all campaigns
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: business } = await admin.from("businesses").select("id").eq("owner_id", user.id).single();
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const { data: campaigns, error } = await admin
      .from("broadcast_campaigns")
      .select("*")
      .eq("business_id", business.id)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: "Failed to fetch campaigns" }, { status: 500 });

    // Get audience counts
    const [allLeads, hotLeads, converted, withAppointments] = await Promise.all([
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", business.id),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("lead_temperature", "hot"),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "converted"),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", business.id).not("status", "eq", "new"),
    ]);

    const audiences = {
      all: allLeads.count || 0,
      leads: (allLeads.count || 0) - (converted.count || 0),
      hot_leads: hotLeads.count || 0,
      converted: converted.count || 0,
      engaged: withAppointments.count || 0,
    };

    return NextResponse.json({ campaigns: campaigns || [], audiences });
  } catch (err) {
    console.error("[Broadcasts GET]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/**
 * POST /api/broadcasts — Create and optionally send a campaign
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: business } = await admin
      .from("businesses")
      .select("id, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_connected")
      .eq("owner_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const body = await request.json();
    const { name, message, target_audience, action, scheduled_at } = body;

    if (!name || !message) {
      return NextResponse.json({ error: "Name and message are required" }, { status: 400 });
    }

    // Create campaign
    const status = action === "send_now" ? "sending" : action === "schedule" ? "scheduled" : "draft";

    const { data: campaign, error } = await admin
      .from("broadcast_campaigns")
      .insert({
        business_id: business.id,
        name,
        message,
        target_audience: target_audience || "all",
        status,
        scheduled_at: scheduled_at || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Broadcasts POST] Insert error:", error.message);
      return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
    }

    // If send_now, start sending
    if (action === "send_now") {
      if (!business.whatsapp_connected || !business.whatsapp_phone_number_id || !business.whatsapp_access_token) {
        await admin.from("broadcast_campaigns").update({ status: "draft" }).eq("id", campaign.id);
        return NextResponse.json({ error: "WhatsApp not connected. Connect in Settings first." }, { status: 400 });
      }

      // Send in background (fire and forget)
      sendBroadcast(admin, business, campaign.id, message, target_audience || "all").catch((err) => {
        console.error("[Broadcasts] Send failed:", err);
      });
    }

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (err) {
    console.error("[Broadcasts POST]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/**
 * Send broadcast messages to target audience
 */
async function sendBroadcast(
  admin: ReturnType<typeof createAdminClient>,
  business: { id: string; whatsapp_phone_number_id: string; whatsapp_access_token: string },
  campaignId: string,
  message: string,
  audience: string
) {
  // Build audience query
  let query = admin.from("leads").select("id, phone, wa_id, name").eq("business_id", business.id);

  switch (audience) {
    case "leads":
      query = query.in("status", ["new", "contacted", "qualified"]);
      break;
    case "hot_leads":
      query = query.eq("lead_temperature", "hot");
      break;
    case "converted":
      query = query.eq("status", "converted");
      break;
    case "engaged":
      query = query.not("status", "eq", "new");
      break;
    default: // "all"
      break;
  }

  const { data: recipients } = await query;
  if (!recipients || recipients.length === 0) {
    await admin.from("broadcast_campaigns").update({ status: "sent", sent_count: 0 }).eq("id", campaignId);
    return;
  }

  const client = new WhatsAppClient({
    phone_number_id: business.whatsapp_phone_number_id,
    access_token: business.whatsapp_access_token,
    business_id: business.id,
  });

  let sentCount = 0;

  for (const recipient of recipients) {
    const to = recipient.wa_id || recipient.phone;
    if (!to) continue;

    // Personalize message
    const personalizedMsg = message
      .replace(/\{name\}/g, recipient.name || "there")
      .replace(/\{phone\}/g, recipient.phone || "");

    try {
      await client.sendTextMessage(to, personalizedMsg);
      sentCount++;

      // Rate limiting: 50ms between messages
      await new Promise((r) => setTimeout(r, 50));
    } catch (err) {
      console.error(`[Broadcast] Failed to send to ${to}:`, err);
    }
  }

  // Update campaign stats
  await admin
    .from("broadcast_campaigns")
    .update({ status: "sent", sent_count: sentCount })
    .eq("id", campaignId);
}

/**
 * DELETE /api/broadcasts — Delete a campaign
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: business } = await admin.from("businesses").select("id").eq("owner_id", user.id).single();
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const { id } = await request.json();
    if (!id) return NextResponse.json({ error: "Campaign ID required" }, { status: 400 });

    await admin.from("broadcast_campaigns").delete().eq("id", id).eq("business_id", business.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[Broadcasts DELETE]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
