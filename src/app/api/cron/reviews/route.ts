import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "@/lib/whatsapp/client";

/**
 * GET /api/cron/reviews
 *
 * Sends review collection messages to customers after completed appointments.
 * Runs daily via cron. Sends 24h after appointment completion.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000).toISOString();

    // Find completed appointments from 24-48h ago that haven't had review sent
    const { data: appointments } = await supabase
      .from("appointments")
      .select(`
        id, customer_name, customer_phone, service, lead_id,
        businesses!inner (
          id, name, whatsapp_phone_number_id, whatsapp_access_token,
          google_review_link, is_active, ai_enabled
        )
      `)
      .eq("status", "completed")
      .gte("updated_at", twoDaysAgo)
      .lte("updated_at", yesterday)
      .is("review_sent", null);

    if (!appointments || appointments.length === 0) {
      return NextResponse.json({ success: true, sent: 0, message: "No reviews to send" });
    }

    let sent = 0;
    for (const apt of appointments) {
      const business = apt.businesses as unknown as {
        id: string;
        name: string;
        whatsapp_phone_number_id: string;
        whatsapp_access_token: string;
        google_review_link: string | null;
        is_active: boolean;
        ai_enabled: boolean;
      };

      if (!business?.is_active || !business?.whatsapp_phone_number_id || !apt.customer_phone) continue;

      const reviewMessage = generateReviewMessage(
        apt.customer_name,
        business.name,
        apt.service,
        business.google_review_link
      );

      try {
        const client = new WhatsAppClient({
          phone_number_id: business.whatsapp_phone_number_id,
          access_token: business.whatsapp_access_token,
          business_id: business.id,
        });

        await client.sendTextMessage(apt.customer_phone, reviewMessage);

        // Mark review as sent
        await supabase
          .from("appointments")
          .update({ review_sent: true, review_sent_at: now.toISOString() })
          .eq("id", apt.id);

        sent++;
      } catch (err) {
        console.error(`[Reviews] Failed for appointment ${apt.id}:`, err);
      }
    }

    return NextResponse.json({ success: true, sent, timestamp: now.toISOString() });
  } catch (error) {
    console.error("[Cron Reviews] Error:", error);
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

function generateReviewMessage(
  customerName: string | null,
  businessName: string,
  service: string | null,
  googleReviewLink: string | null
): string {
  const name = customerName || "there";
  const svc = service ? ` for ${service}` : "";

  let msg = `Hi ${name}! 👋\n\nThank you for visiting ${businessName}${svc}! We hope you had a great experience.\n\nWould you mind sharing your feedback? It helps us improve and helps others find us.\n\n⭐⭐⭐⭐⭐\nHow would you rate your experience?`;

  if (googleReviewLink) {
    msg += `\n\nYou can also leave a review here:\n${googleReviewLink}`;
  }

  msg += `\n\nThank you! 🙏`;
  return msg;
}
