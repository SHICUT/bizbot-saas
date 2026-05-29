import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "@/lib/whatsapp/client";

/**
 * Follow-Up Engine
 *
 * Handles automated follow-up messages for leads that went quiet.
 * Called by a cron job (Vercel Cron or external scheduler).
 *
 * Follow-up strategy:
 * - Day 1 (24h): Gentle reminder about their inquiry
 * - Day 3 (72h): Offer something (trial, discount, info)
 * - Day 7 (168h): Final check-in, no pressure
 *
 * Rules:
 * - Never follow up if lead replied after the follow-up was scheduled
 * - Never follow up if lead is already converted or lost
 * - Max 3 follow-ups per lead
 * - Respect business hours (only send during open hours)
 */

// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface FollowUpCandidate {
  lead_id: string;
  business_id: string;
  lead_name: string | null;
  lead_phone: string;
  wa_id: string;
  last_message_at: string;
  follow_up_context: string | null;
  business_name: string;
  phone_number_id: string;
  access_token: string;
  ai_language: string;
}

/**
 * Process all pending follow-ups.
 * Called by cron job every hour.
 */
export async function processFollowUps(): Promise<{ sent: number; skipped: number }> {
  const supabase = createAdminClient();
  let sent = 0;
  let skipped = 0;

  // Find leads that need follow-up
  const { data: candidates } = await supabase
    .from("leads")
    .select(`
      id,
      business_id,
      name,
      phone,
      wa_id,
      last_message_at,
      metadata,
      businesses!inner (
        name,
        whatsapp_phone_number_id,
        whatsapp_access_token,
        ai_language,
        ai_enabled,
        is_active
      )
    `)
    .in("status", ["new", "contacted"])
    .not("metadata->follow_up_scheduled", "is", null)
    .limit(50);

  if (!candidates || candidates.length === 0) {
    return { sent: 0, skipped: 0 };
  }

  const now = new Date();

  for (const candidate of candidates) {
    const metadata = (candidate.metadata || {}) as Record<string, unknown>;
    const followUpAt = metadata.follow_up_at as string | undefined;
    const followUpCount = (metadata.follow_up_count as number) || 0;

    // Skip if not yet time
    if (followUpAt && new Date(followUpAt) > now) {
      skipped++;
      continue;
    }

    // Skip if max follow-ups reached
    if (followUpCount >= 3) {
      skipped++;
      continue;
    }

    // Skip if lead replied after follow-up was scheduled
    const lastMsg = candidate.last_message_at;
    const scheduledAt = metadata.follow_up_scheduled_at as string;
    if (lastMsg && scheduledAt && new Date(lastMsg) > new Date(scheduledAt)) {
      // Lead replied — clear follow-up
      await supabase
        .from("leads")
        .update({
          metadata: {
            ...metadata,
            follow_up_scheduled: false,
          },
        })
        .eq("id", candidate.id);
      skipped++;
      continue;
    }

    // Get business info
    const business = candidate.businesses as unknown as {
      name: string;
      whatsapp_phone_number_id: string;
      whatsapp_access_token: string;
      ai_language: string;
      ai_enabled: boolean;
      is_active: boolean;
    };

    if (!business?.is_active || !business?.ai_enabled) {
      skipped++;
      continue;
    }

    // Generate follow-up message
    const message = generateFollowUpMessage(
      followUpCount,
      candidate.name,
      metadata.follow_up_context as string | undefined,
      business.ai_language
    );

    // Send via WhatsApp
    try {
      const client = new WhatsAppClient({
        phone_number_id: business.whatsapp_phone_number_id,
        access_token: business.whatsapp_access_token,
        business_id: candidate.business_id,
      });

      await client.sendTextMessage(candidate.wa_id, message);

      // Update follow-up count
      await supabase
        .from("leads")
        .update({
          metadata: {
            ...metadata,
            follow_up_count: followUpCount + 1,
            last_follow_up_at: now.toISOString(),
            follow_up_scheduled: followUpCount + 1 < 3, // Schedule next if under limit
            follow_up_at: followUpCount === 0
              ? new Date(now.getTime() + 72 * 60 * 60 * 1000).toISOString() // Next: 3 days
              : new Date(now.getTime() + 168 * 60 * 60 * 1000).toISOString(), // Next: 7 days
          },
        })
        .eq("id", candidate.id);

      // Store the outbound message
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("business_id", candidate.business_id)
        .eq("lead_id", candidate.id)
        .single();

      if (conv) {
        await supabase.from("messages").insert({
          business_id: candidate.business_id,
          conversation_id: conv.id,
          lead_id: candidate.id,
          direction: "outbound",
          content: message,
          message_type: "text",
          is_ai_generated: true,
          status: "sent",
        });
      }

      sent++;
    } catch (error) {
      console.error(`[FollowUp] Failed to send to lead ${candidate.id}:`, error);
      skipped++;
    }
  }

  return { sent, skipped };
}

/**
 * Generate a follow-up message based on the attempt number.
 */
function generateFollowUpMessage(
  attemptNumber: number,
  name: string | null,
  context: string | undefined,
  language: string
): string {
  const greeting = name ? `Hi ${name}` : "Hi";

  if (language === "hinglish") {
    return getHinglishFollowUp(attemptNumber, greeting, context);
  }

  // English follow-ups
  switch (attemptNumber) {
    case 0: // First follow-up (24h)
      return context
        ? `${greeting}! 👋 Just following up on your inquiry about ${context}. Would you like me to help you with anything else?`
        : `${greeting}! 👋 Just checking in — did you have any other questions? Happy to help!`;

    case 1: // Second follow-up (72h)
      return context
        ? `${greeting}, hope you're doing well! I wanted to let you know we have some great options for ${context}. Would you like to schedule a visit to check things out? No pressure at all 😊`
        : `${greeting}, hope you're doing well! Just wanted to remind you that we're here if you need anything. Feel free to reach out anytime!`;

    case 2: // Third follow-up (7 days)
      return `${greeting}! Just a final check-in from our side. If you ever need help in the future, don't hesitate to message us. We're always here! 🙏`;

    default:
      return `${greeting}! Let us know if there's anything we can help with. 😊`;
  }
}

function getHinglishFollowUp(
  attemptNumber: number,
  greeting: string,
  context: string | undefined
): string {
  switch (attemptNumber) {
    case 0:
      return context
        ? `${greeting}! 👋 Aapka ${context} ke baare mein inquiry thi — kya main aur kuch help kar sakta/sakti hoon?`
        : `${greeting}! 👋 Bas check kar raha/rahi thi — koi aur question hai toh batayein!`;

    case 1:
      return context
        ? `${greeting}, hope all is well! ${context} ke liye humari taraf se kuch achhe options hain. Ek baar visit karke dekhna chahenge? 😊`
        : `${greeting}, sab theek? Agar kuch bhi chahiye toh message kar dijiye, hum yahan hain!`;

    case 2:
      return `${greeting}! Bas ek last check-in. Future mein kabhi bhi help chahiye toh message karna, hum hamesha available hain! 🙏`;

    default:
      return `${greeting}! Kuch bhi chahiye toh batayein 😊`;
  }
}
