import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "@/lib/whatsapp/client";

/**
 * Follow-Up Automation Engine
 *
 * Automatically re-engages leads who stop replying.
 * Business-type aware messaging. Stops when customer replies.
 *
 * Schedule:
 * - Step 1: 24 hours after last message (gentle reminder)
 * - Step 2: 3 days after last message (offer/value)
 * - Step 3: 7 days after last message (final check, book trial)
 *
 * Rules:
 * - Never follow up converted or lost leads
 * - Stop immediately when customer replies
 * - Max 3 follow-ups per lead
 * - Respect business hours (IST 9 AM - 9 PM)
 * - Only follow up leads from WhatsApp/Instagram (have wa_id)
 */

const FOLLOW_UP_DELAYS_HOURS = [24, 72, 168]; // 1 day, 3 days, 7 days

interface FollowUpResult {
  sent: number;
  skipped: number;
  errors: number;
  details: Array<{ leadId: string; step: number; status: "sent" | "skipped" | "error"; reason?: string }>;
}

/**
 * Process all pending follow-ups.
 * Called by cron job (daily or hourly).
 */
export async function processFollowUps(): Promise<FollowUpResult> {
  const supabase = createAdminClient();
  const result: FollowUpResult = { sent: 0, skipped: 0, errors: 0, details: [] };

  // Check business hours (IST)
  const nowIST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const hour = nowIST.getHours();
  if (hour < 9 || hour >= 21) {
    return { ...result, skipped: 1, details: [{ leadId: "all", step: 0, status: "skipped", reason: "Outside business hours (9AM-9PM IST)" }] };
  }

  const now = new Date();

  // Find eligible leads: active leads with wa_id, not converted/lost, last message > 24h ago
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: leads } = await supabase
    .from("leads")
    .select(`
      id, name, phone, wa_id, status, lead_temperature, last_message_at, metadata, source,
      businesses!inner (
        id, name, type, whatsapp_phone_number_id, whatsapp_access_token,
        ai_enabled, is_active, ai_language
      )
    `)
    .in("status", ["new", "contacted", "qualified"])
    .not("wa_id", "is", null)
    .lt("last_message_at", oneDayAgo)
    .limit(100);

  if (!leads || leads.length === 0) return result;

  for (const lead of leads) {
    const business = lead.businesses as unknown as {
      id: string; name: string; type: string;
      whatsapp_phone_number_id: string; whatsapp_access_token: string;
      ai_enabled: boolean; is_active: boolean; ai_language: string;
    };

    // Skip if business inactive or AI disabled
    if (!business?.is_active || !business?.ai_enabled || !business?.whatsapp_phone_number_id) {
      result.skipped++;
      continue;
    }

    const metadata = (lead.metadata || {}) as Record<string, unknown>;
    const followUpCount = (metadata.follow_up_count as number) || 0;

    // Max 3 follow-ups
    if (followUpCount >= 3) {
      result.skipped++;
      continue;
    }

    // Check if enough time has passed for this step
    const lastMsgTime = new Date(lead.last_message_at || now).getTime();
    const lastFollowUp = metadata.last_follow_up_at ? new Date(metadata.last_follow_up_at as string).getTime() : 0;
    const referenceTime = Math.max(lastMsgTime, lastFollowUp);
    const hoursSinceReference = (now.getTime() - referenceTime) / (1000 * 60 * 60);
    const requiredDelay = FOLLOW_UP_DELAYS_HOURS[followUpCount] || 168;

    if (hoursSinceReference < requiredDelay) {
      result.skipped++;
      continue;
    }

    // Check if customer replied after our last follow-up (stop sequence)
    if (lastFollowUp > 0 && lastMsgTime > lastFollowUp) {
      // Customer replied — clear follow-up state
      await supabase.from("leads").update({
        metadata: { ...metadata, follow_up_active: false },
      }).eq("id", lead.id);
      result.skipped++;
      result.details.push({ leadId: lead.id, step: followUpCount, status: "skipped", reason: "Customer replied" });
      continue;
    }

    // Generate message based on step + business type
    const message = generateFollowUpMessage(
      followUpCount,
      lead.name,
      business.type,
      business.name,
      metadata.last_inquiry as string | undefined,
      business.ai_language
    );

    // Send via WhatsApp
    try {
      const client = new WhatsAppClient({
        phone_number_id: business.whatsapp_phone_number_id,
        access_token: business.whatsapp_access_token,
        business_id: business.id,
      });

      await client.sendTextMessage(lead.wa_id!, message);

      // Update metadata
      await supabase.from("leads").update({
        metadata: {
          ...metadata,
          follow_up_count: followUpCount + 1,
          follow_up_active: true,
          last_follow_up_at: now.toISOString(),
          last_follow_up_step: followUpCount + 1,
        },
      }).eq("id", lead.id);

      // Store outbound message
      const { data: conv } = await supabase
        .from("conversations")
        .select("id")
        .eq("business_id", business.id)
        .eq("lead_id", lead.id)
        .limit(1)
        .single();

      if (conv) {
        await supabase.from("messages").insert({
          business_id: business.id,
          conversation_id: conv.id,
          lead_id: lead.id,
          direction: "outbound",
          content: message,
          message_type: "text",
          is_ai_generated: true,
          status: "sent",
        });

        // Increment AI reply usage (follow-up messages count toward plan limit)
        await supabase.rpc("increment_message_usage", { p_business_id: business.id });
      }

      result.sent++;
      result.details.push({ leadId: lead.id, step: followUpCount + 1, status: "sent" });
    } catch (err) {
      console.error(`[FollowUp] Send failed for lead ${lead.id}:`, err);
      result.errors++;
      result.details.push({ leadId: lead.id, step: followUpCount + 1, status: "error", reason: String(err) });
    }
  }

  return result;
}

/**
 * Business-type aware follow-up message generator
 */
function generateFollowUpMessage(
  step: number,
  name: string | null,
  businessType: string,
  businessName: string,
  lastInquiry: string | undefined,
  language: string
): string {
  const greeting = name ? `Hi ${name}` : "Hi";

  if (language === "hinglish" || language === "hindi") {
    return generateHinglishFollowUp(step, greeting, businessType, businessName, lastInquiry);
  }

  // English follow-ups by business type
  switch (step) {
    case 0: // Step 1: 24h — Gentle reminder
      return getStep1Message(greeting, businessType, businessName, lastInquiry);
    case 1: // Step 2: 3 days — Offer/value
      return getStep2Message(greeting, businessType, businessName);
    case 2: // Step 3: 7 days — Final CTA
      return getStep3Message(greeting, businessType, businessName);
    default:
      return `${greeting}! Let us know if we can help with anything. 😊`;
  }
}

function getStep1Message(greeting: string, type: string, bizName: string, inquiry?: string): string {
  const topic = inquiry ? ` about ${inquiry}` : "";
  const typeMessages: Record<string, string> = {
    gym: `${greeting}! 👋 Just checking in${topic}. Still thinking about joining? Happy to answer any questions about our plans or schedule a free trial session!`,
    salon: `${greeting}! 👋 Following up${topic}. Would you like to book an appointment? We have some great slots available this week!`,
    clinic: `${greeting}! 👋 Just checking in${topic}. Would you like to schedule a consultation? We have availability this week.`,
    restaurant: `${greeting}! 👋 Hope you're doing well! Still thinking about visiting ${bizName}? We'd love to serve you. Any questions about our menu?`,
    real_estate: `${greeting}! 👋 Following up on your inquiry${topic}. Would you like to schedule a site visit? I can arrange a convenient time for you.`,
    coaching: `${greeting}! 👋 Just checking in${topic}. Would you like to attend a free demo class? We have new batches starting soon!`,
    school: `${greeting}! 👋 Just checking in${topic}. Would you like to schedule a school visit? Our admissions team would be happy to show you around the campus! 🏫`,
  };
  return typeMessages[type] || `${greeting}! 👋 Just following up${topic}. Did you have any other questions about ${bizName}? Happy to help!`;
}

function getStep2Message(greeting: string, type: string, bizName: string): string {
  const typeMessages: Record<string, string> = {
    gym: `${greeting}, hope you're doing well! 💪\n\nWanted to let you know — we're offering a complimentary fitness assessment for new members this week. No commitment required!\n\nWould you like me to book a slot for you?`,
    salon: `${greeting}, hope you're having a great week! ✨\n\nWe have some special offers running at ${bizName} right now. Would you like to hear about them?\n\nI can also help you find the perfect time for your appointment!`,
    clinic: `${greeting}, hope you're doing well!\n\nJust a reminder that early check-ups can prevent many health issues. At ${bizName}, we offer comprehensive health packages.\n\nWould you like me to share the details?`,
    restaurant: `${greeting}! 🍽️\n\nWe have some exciting new additions to our menu at ${bizName}! Plus, there's a special offer running for our regular guests.\n\nWould you like to reserve a table?`,
    real_estate: `${greeting}! 🏠\n\nWanted to share some updates — we have a few new units available with special pre-booking offers.\n\nWould you like me to send you the latest floor plans and pricing?`,
    coaching: `${greeting}! 📚\n\nQuick update — our new batch is starting soon with limited seats. We're also offering an early enrollment discount.\n\nWould you like me to reserve a spot for you?`,
    school: `${greeting}! 🏫\n\nQuick update from ${bizName} — admissions are open and we have limited seats available for this session.\n\nWould you like to schedule a campus visit or speak with our admissions team? We'd love to help you with the process!`,
  };
  return typeMessages[type] || `${greeting}, hope you're doing well! 😊\n\nWanted to share that ${bizName} currently has some great offers available. Would you like to know more?\n\nNo pressure at all — just wanted to make sure you don't miss out!`;
}

function getStep3Message(greeting: string, type: string, bizName: string): string {
  const typeMessages: Record<string, string> = {
    gym: `${greeting}! 🙏\n\nThis is just a final check-in from ${bizName}. If you're ever ready to start your fitness journey, we're here for you.\n\nNo pressure — but if you'd like a free trial session, just say the word! We'll make it happen. 💪`,
    salon: `${greeting}! 🙏\n\nJust a final note from ${bizName}. Whenever you're ready for some self-care time, we'd love to pamper you!\n\nFeel free to reach out anytime for bookings or questions. Take care! ✨`,
    clinic: `${greeting}! 🙏\n\nJust a final reminder from ${bizName}. Your health is important to us.\n\nWhenever you're ready to schedule a visit, just message us. We're always here to help!`,
    restaurant: `${greeting}! 🙏\n\nFinal check-in from ${bizName}. We'd love to host you whenever you're ready!\n\nOur doors are always open. Feel free to message us for reservations anytime!`,
    real_estate: `${greeting}! 🙏\n\nThis is a final check-in from ${bizName}. The property market is always moving, so don't hesitate to reach out when you're ready.\n\nI'm here to help whenever you need. All the best! 🏠`,
    coaching: `${greeting}! 🙏\n\nFinal reminder from ${bizName}. Education is always a good investment, and we're here whenever you're ready.\n\nFeel free to reach out for demo classes or batch information anytime!`,
    school: `${greeting}! 🙏\n\nFinal check-in from ${bizName}. We understand choosing the right school is an important decision.\n\nWhenever you're ready to visit or have questions about admissions, fees, or anything else — we're here to help!\n\nWishing the best for your child's education. 🏫`,
  };
  return typeMessages[type] || `${greeting}! 🙏\n\nJust a final check-in from ${bizName}. If you ever need help in the future, don't hesitate to reach out.\n\nWe're always here for you. Take care!`;
}

function generateHinglishFollowUp(step: number, greeting: string, type: string, bizName: string, inquiry?: string): string {
  const topic = inquiry ? ` ${inquiry} ke baare mein` : "";

  switch (step) {
    case 0:
      if (type === "gym") return `${greeting}! 👋 Bas check kar raha tha${topic}. Abhi bhi join karne ka soch rahe hain? Free trial session book karwa deta hoon! 💪`;
      if (type === "salon") return `${greeting}! 👋 Aapki inquiry${topic} ke baare mein follow up kar raha tha. Kya appointment book karni hai? Is week achhe slots available hain!`;
      if (type === "school") return `${greeting}! 👋 Bas check kar raha tha${topic}. Kya aap school visit schedule karna chahenge? Humari admissions team aapko campus dikha sakti hai! 🏫`;
      return `${greeting}! 👋 Bas check kar raha tha${topic}. Kuch aur jaanna hai ${bizName} ke baare mein? Happy to help! 😊`;

    case 1:
      if (type === "gym") return `${greeting}, kaise hain aap? 💪\n\nAapko batana tha — is week new members ke liye free fitness assessment offer hai. Koi commitment nahi!\n\nSlot book karwa doon?`;
      if (type === "salon") return `${greeting}! ✨\n\n${bizName} mein abhi kuch special offers chal rahe hain. Sunna chahenge?\n\nAppointment ke liye bhi help kar sakta hoon!`;
      if (type === "school") return `${greeting}! 🏫\n\n${bizName} mein admissions open hain aur limited seats available hain is session ke liye.\n\nKya aap campus visit schedule karna chahenge? Admissions team se baat karwa sakte hain!`;
      return `${greeting}! 😊\n\n${bizName} mein abhi kuch achhe offers available hain. Details chahiye?\n\nKoi pressure nahi — bas miss na ho jaaye isliye bata raha tha!`;

    case 2:
      if (type === "gym") return `${greeting}! 🙏\n\nYe last check-in hai ${bizName} ki taraf se. Jab bhi ready ho fitness journey start karne ke liye, hum yahan hain.\n\nFree trial session chahiye toh bas bata dena! 💪`;
      if (type === "school") return `${greeting}! 🙏\n\n${bizName} ki taraf se last check-in. Sahi school chunna bohot zaroori decision hai — hum samajhte hain.\n\nJab bhi ready ho visit ke liye ya koi sawal ho admission ke baare mein, message kar dena! 🏫`;
      return `${greeting}! 🙏\n\n${bizName} ki taraf se last follow-up. Jab bhi help chahiye, message kar dena. Hamesha available hain!\n\nTake care! 😊`;

    default:
      return `${greeting}! Kuch bhi chahiye toh batayein. 😊`;
  }
}

/**
 * Get follow-up analytics for a business
 */
export async function getFollowUpStats(businessId: string): Promise<{
  totalSent: number;
  repliedBack: number;
  converted: number;
  activeSequences: number;
  conversionRate: number;
}> {
  const supabase = createAdminClient();

  const { data: leads } = await supabase
    .from("leads")
    .select("id, status, metadata")
    .eq("business_id", businessId);

  if (!leads) return { totalSent: 0, repliedBack: 0, converted: 0, activeSequences: 0, conversionRate: 0 };

  let totalSent = 0;
  let repliedBack = 0;
  let converted = 0;
  let activeSequences = 0;

  for (const lead of leads) {
    const metadata = (lead.metadata || {}) as Record<string, unknown>;
    const count = (metadata.follow_up_count as number) || 0;
    if (count > 0) {
      totalSent += count;
      if (metadata.follow_up_active === false && count > 0) repliedBack++;
      if (lead.status === "converted" && count > 0) converted++;
      if (metadata.follow_up_active === true) activeSequences++;
    }
  }

  const conversionRate = (repliedBack + converted) > 0 ? Math.round((converted / (repliedBack + converted)) * 100) : 0;

  return { totalSent, repliedBack, converted, activeSequences, conversionRate };
}
