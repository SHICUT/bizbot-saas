/**
 * Property Media Handler
 *
 * After AI generates a text reply for a real_estate business,
 * this module checks if media (images, brochures, location) should
 * be sent along with the reply.
 *
 * Triggers:
 * - AI mentions a specific property name → send that property's image
 * - Customer asks for brochure/PDF → send brochure document
 * - Customer asks for location/map → send location pin
 * - Customer asks for floor plan → send floor plan image
 * - AI recommends properties → send first property image
 *
 * This runs AFTER the text reply is sent (non-blocking).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { WhatsAppClient } from "@/lib/whatsapp/client";
import { recommendProperties, formatRecommendationsForAI, type CustomerRequirements } from "./property-recommender";

interface MediaContext {
  businessId: string;
  businessType: string;
  phoneNumberId: string;
  accessToken: string;
  leadPhone: string;
  leadMetadata: Record<string, unknown>;
  incomingMessage: string;
  aiReply: string;
}

/**
 * Check if property media should be sent, and send it.
 * Returns the number of media messages sent.
 */
export async function handlePropertyMedia(ctx: MediaContext): Promise<number> {
  if (ctx.businessType !== "real_estate") return 0;

  const client = new WhatsAppClient({
    phone_number_id: ctx.phoneNumberId,
    access_token: ctx.accessToken,
    business_id: ctx.businessId,
  });

  let mediaSent = 0;
  const lower = ctx.incomingMessage.toLowerCase();

  // Check for brochure request
  if (/\b(brochure|pdf|booklet|catalog|details.*pdf)\b/i.test(lower)) {
    mediaSent += await sendMatchingBrochure(client, ctx);
  }

  // Check for floor plan request
  if (/\b(floor\s*plan|layout|map.*flat|plan.*bhk)\b/i.test(lower)) {
    mediaSent += await sendMatchingFloorPlan(client, ctx);
  }

  // Check for location/map request
  if (/\b(location|address|direction|map|where|kahan|navigate)\b/i.test(lower)) {
    mediaSent += await sendPropertyLocation(client, ctx);
  }

  // Check for image/gallery request
  if (/\b(photo|image|picture|gallery|dekho|dikhao|show)\b/i.test(lower)) {
    mediaSent += await sendPropertyImage(client, ctx);
  }

  return mediaSent;
}

/**
 * Get property recommendations and format them for AI context injection.
 * Called before AI generates response to enrich the system prompt.
 */
export async function getRecommendationContext(
  businessId: string,
  leadMetadata: Record<string, unknown>
): Promise<string> {
  const requirements: CustomerRequirements = {
    budget: leadMetadata.budget as string | undefined,
    location: leadMetadata.location as string | undefined,
    propertyType: leadMetadata.property_type as string | undefined,
    bhk: leadMetadata.bhk as string | undefined,
    purpose: leadMetadata.purpose as string | undefined,
    timeline: leadMetadata.timeline as string | undefined,
  };

  // Only recommend if we have at least one requirement
  const hasReqs = Object.values(requirements).some((v) => v);
  if (!hasReqs) return "";

  const matches = await recommendProperties(businessId, requirements, 3);
  if (matches.length === 0) return "";

  return formatRecommendationsForAI(matches);
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

async function sendMatchingBrochure(
  client: WhatsAppClient,
  ctx: MediaContext
): Promise<number> {
  const supabase = createAdminClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("name, brochure_url")
    .eq("business_id", ctx.businessId)
    .eq("is_active", true)
    .not("brochure_url", "is", null)
    .limit(1);

  if (properties?.[0]?.brochure_url) {
    try {
      await client.sendDocument(
        ctx.leadPhone,
        properties[0].brochure_url,
        `${properties[0].name} - Brochure.pdf`,
        `📄 ${properties[0].name} — Project Brochure`
      );
      return 1;
    } catch (e) {
      console.warn("[PropertyMedia] Brochure send failed:", e);
    }
  }
  return 0;
}

async function sendMatchingFloorPlan(
  client: WhatsAppClient,
  ctx: MediaContext
): Promise<number> {
  const supabase = createAdminClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("name, floor_plans")
    .eq("business_id", ctx.businessId)
    .eq("is_active", true)
    .limit(5);

  for (const prop of properties || []) {
    const plans = prop.floor_plans as Array<{ url: string; caption?: string }> | null;
    if (plans && plans.length > 0) {
      try {
        await client.sendImage(
          ctx.leadPhone,
          plans[0].url,
          `📐 ${prop.name} — Floor Plan${plans[0].caption ? ` (${plans[0].caption})` : ""}`
        );
        return 1;
      } catch (e) {
        console.warn("[PropertyMedia] Floor plan send failed:", e);
      }
    }
  }
  return 0;
}

async function sendPropertyLocation(
  client: WhatsAppClient,
  ctx: MediaContext
): Promise<number> {
  const supabase = createAdminClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("name, latitude, longitude, address, city")
    .eq("business_id", ctx.businessId)
    .eq("is_active", true)
    .not("latitude", "is", null)
    .limit(1);

  if (properties?.[0]?.latitude && properties?.[0]?.longitude) {
    try {
      await client.sendLocation(
        ctx.leadPhone,
        properties[0].latitude,
        properties[0].longitude,
        properties[0].name,
        [properties[0].address, properties[0].city].filter(Boolean).join(", ")
      );
      return 1;
    } catch (e) {
      console.warn("[PropertyMedia] Location send failed:", e);
    }
  }
  return 0;
}

async function sendPropertyImage(
  client: WhatsAppClient,
  ctx: MediaContext
): Promise<number> {
  const supabase = createAdminClient();
  const { data: properties } = await supabase
    .from("properties")
    .select("name, images")
    .eq("business_id", ctx.businessId)
    .eq("is_active", true)
    .limit(5);

  for (const prop of properties || []) {
    const images = prop.images as Array<{ url: string; caption?: string }> | null;
    if (images && images.length > 0) {
      try {
        await client.sendImage(
          ctx.leadPhone,
          images[0].url,
          `🏠 ${prop.name}${images[0].caption ? ` — ${images[0].caption}` : ""}`
        );
        return 1;
      } catch (e) {
        console.warn("[PropertyMedia] Image send failed:", e);
      }
    }
  }
  return 0;
}
