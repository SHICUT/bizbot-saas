import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "@/lib/whatsapp/client";

// Daily limit: 250 messages/day to protect WhatsApp health score
const DAILY_BROADCAST_LIMIT = 250;

/**
 * GET /api/broadcasts — List all campaigns + audience stats
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: business } = await admin.from("businesses").select("id").eq("owner_id", user.id).single();
    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const now = new Date();
    const today = now.toISOString().split("T")[0];
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [campaignsResult, allLeads, hotLeads, converted, withAppointments, optedOut, inWindow, dailyStats] = await Promise.all([
      admin.from("broadcast_campaigns").select("*").eq("business_id", business.id).order("created_at", { ascending: false }),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", business.id).not("opted_out", "eq", true),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("lead_temperature", "hot").not("opted_out", "eq", true),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("status", "converted").not("opted_out", "eq", true),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", business.id).not("status", "eq", "new").not("opted_out", "eq", true),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", business.id).eq("opted_out", true),
      // Contacts who messaged within 24h (eligible for non-template messages)
      admin.from("leads").select("id", { count: "exact", head: true }).eq("business_id", business.id).gte("last_message_at", oneDayAgo).not("opted_out", "eq", true),
      admin.from("broadcast_daily_stats").select("messages_sent").eq("business_id", business.id).eq("date", today).single(),
    ]);

    const sentToday = dailyStats.data?.messages_sent || 0;
    const remainingToday = Math.max(0, DAILY_BROADCAST_LIMIT - sentToday);

    const audiences = {
      all: allLeads.count || 0,
      leads: Math.max(0, (allLeads.count || 0) - (converted.count || 0)),
      hot_leads: hotLeads.count || 0,
      converted: converted.count || 0,
      engaged: withAppointments.count || 0,
    };

    // Health score: ratio of in-window contacts to all contacts
    const totalContacts = allLeads.count || 1;
    const inWindowCount = inWindow.count || 0;
    const healthScore = Math.round((inWindowCount / totalContacts) * 100);

    return NextResponse.json({
      campaigns: campaignsResult.data || [],
      audiences,
      safety: {
        optedOutCount: optedOut.count || 0,
        inWindowCount,
        totalEligible: allLeads.count || 0,
        healthScore,
        sentToday,
        remainingToday,
        dailyLimit: DAILY_BROADCAST_LIMIT,
      },
    });
  } catch (err) {
    console.error("[Broadcasts GET]", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

/**
 * POST /api/broadcasts — Create, test, or send a campaign
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const admin = createAdminClient();
    const { data: business } = await admin
      .from("businesses")
      .select("id, name, phone, whatsapp_phone_number_id, whatsapp_access_token, whatsapp_connected")
      .eq("owner_id", user.id)
      .single();

    if (!business) return NextResponse.json({ error: "No business" }, { status: 404 });

    const body = await request.json();
    const { name, message, target_audience, action, scheduled_at, test_number } = body;

    if (!name || !message) {
      return NextResponse.json({ error: "Name and message are required" }, { status: 400 });
    }

    // Check WhatsApp connection before any send action
    if (action !== "draft" && !business.whatsapp_connected) {
      return NextResponse.json({ error: "WhatsApp not connected. Connect in Settings first." }, { status: 400 });
    }

    // TEST SEND — send only to owner/specified number
    if (action === "test_send") {
      const testTo = test_number || business.phone;
      if (!testTo) return NextResponse.json({ error: "No test number available. Add your phone in Settings." }, { status: 400 });

      const client = new WhatsAppClient({
        phone_number_id: business.whatsapp_phone_number_id,
        access_token: business.whatsapp_access_token,
        business_id: business.id,
      });

      const testMessage = message.replace(/\{name\}/g, "Test Customer");
      try {
        await client.sendTextMessage(testTo, `🧪 TEST BROADCAST:\n\n${testMessage}`);
        return NextResponse.json({ success: true, message: `Test message sent to ${testTo}` });
      } catch (err) {
        return NextResponse.json({ error: `Test send failed: ${err instanceof Error ? err.message : "Unknown error"}` }, { status: 500 });
      }
    }

    // AUDIENCE PREVIEW — return counts without creating campaign
    if (action === "preview") {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

      const [allRecipients, inWindow, optedOut] = await Promise.all([
        buildAudienceQuery(admin, business.id, target_audience || "all"),
        admin.from("leads").select("id", { count: "exact", head: true })
          .eq("business_id", business.id)
          .gte("last_message_at", oneDayAgo)
          .not("opted_out", "eq", true),
        admin.from("leads").select("id", { count: "exact", head: true })
          .eq("business_id", business.id)
          .eq("opted_out", true),
      ]);

      const totalRecipients = (allRecipients.count || 0);
      const inWindowCount = inWindow.count || 0;
      const riskScore = totalRecipients > 0 ? Math.round(((totalRecipients - inWindowCount) / totalRecipients) * 100) : 0;

      return NextResponse.json({
        totalRecipients,
        inWindowCount,
        outsideWindowCount: Math.max(0, totalRecipients - inWindowCount),
        optedOutCount: optedOut.count || 0,
        riskScore,
        riskLevel: riskScore > 60 ? "high" : riskScore > 30 ? "medium" : "low",
      });
    }

    // CHECK DAILY LIMIT before creating any sending campaign
    if (action === "send_now") {
      const today = new Date().toISOString().split("T")[0];
      const { data: dailyStat } = await admin
        .from("broadcast_daily_stats")
        .select("messages_sent")
        .eq("business_id", business.id)
        .eq("date", today)
        .single();

      const sentToday = dailyStat?.messages_sent || 0;
      if (sentToday >= DAILY_BROADCAST_LIMIT) {
        return NextResponse.json({
          error: `Daily limit reached (${DAILY_BROADCAST_LIMIT} messages/day). This protects your WhatsApp account health. Try again tomorrow.`,
        }, { status: 429 });
      }
    }

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
        confirmed_by_owner: action === "send_now",
      })
      .select()
      .single();

    if (error) {
      console.error("[Broadcasts POST] Insert error:", error.message);
      return NextResponse.json({ error: "Failed to create campaign" }, { status: 500 });
    }

    if (action === "send_now") {
      // Fire-and-forget with safety checks
      sendBroadcastSafe(admin, business, campaign.id, message, target_audience || "all").catch((err) => {
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
 * Build typed audience query helper
 */
async function buildAudienceQuery(
  admin: ReturnType<typeof createAdminClient>,
  businessId: string,
  audience: string
) {
  let query = admin.from("leads")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .not("opted_out", "eq", true);

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
  }
  return query;
}

/**
 * Send broadcast with full safety checks:
 * - Skip opted-out contacts
 * - Track sent/failed counts
 * - Rate limit and daily counter
 */
async function sendBroadcastSafe(
  admin: ReturnType<typeof createAdminClient>,
  business: { id: string; whatsapp_phone_number_id: string; whatsapp_access_token: string },
  campaignId: string,
  message: string,
  audience: string
) {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const today = now.toISOString().split("T")[0];

  // Build audience — exclude opted-out contacts
  let query = admin
    .from("leads")
    .select("id, phone, wa_id, name, last_message_at")
    .eq("business_id", business.id)
    .not("opted_out", "eq", true);

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
  }

  const { data: recipients } = await query;
  if (!recipients || recipients.length === 0) {
    await admin.from("broadcast_campaigns").update({ status: "sent", sent_count: 0 }).eq("id", campaignId);
    return;
  }

  // Check daily limit headroom
  const { data: dailyStat } = await admin
    .from("broadcast_daily_stats")
    .select("messages_sent")
    .eq("business_id", business.id)
    .eq("date", today)
    .single();

  const sentTodayBefore = dailyStat?.messages_sent || 0;
  const canSendCount = Math.max(0, DAILY_BROADCAST_LIMIT - sentTodayBefore);
  const toSend = recipients.slice(0, canSendCount);

  const client = new WhatsAppClient({
    phone_number_id: business.whatsapp_phone_number_id,
    access_token: business.whatsapp_access_token,
    business_id: business.id,
  });

  let sentCount = 0;
  let failedCount = 0;
  let outsideWindowCount = 0;

  for (const recipient of toSend) {
    const to = recipient.wa_id || recipient.phone;
    if (!to) { failedCount++; continue; }

    // Track 24h window
    const isInWindow = recipient.last_message_at && new Date(recipient.last_message_at) > new Date(oneDayAgo);
    if (!isInWindow) outsideWindowCount++;

    const personalizedMsg = message
      .replace(/\{name\}/g, recipient.name || "there")
      .replace(/\{phone\}/g, recipient.phone || "");

    try {
      await client.sendTextMessage(to, personalizedMsg);
      sentCount++;
      // 100ms between messages (WhatsApp best practice)
      await new Promise((r) => setTimeout(r, 100));
    } catch (err) {
      console.error(`[Broadcast] Failed to ${to}:`, err);
      failedCount++;
    }
  }

  // Update campaign stats
  await admin.from("broadcast_campaigns").update({
    status: "sent",
    sent_count: sentCount,
    failed_count: failedCount,
    outside_window_count: outsideWindowCount,
  }).eq("id", campaignId);

  // Update daily counter
  const newTotal = sentTodayBefore + sentCount;
  await admin.from("broadcast_daily_stats")
    .upsert({ business_id: business.id, date: today, messages_sent: newTotal }, { onConflict: "business_id,date" });
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
