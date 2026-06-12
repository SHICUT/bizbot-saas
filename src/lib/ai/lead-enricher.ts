/**
 * Lead Enricher — Extracts structured data from AI conversations
 *
 * After each AI reply, this module:
 * 1. Scans the conversation for collected lead information
 * 2. Saves extracted data to lead.metadata
 * 3. Updates lead score and temperature based on signals
 * 4. Creates timeline events for important actions
 * 5. Updates pipeline stage when appropriate
 *
 * Works alongside appointment-detector.ts (which handles bookings).
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { getIndustryConfig } from "./industry-config";

interface EnrichmentResult {
  fieldsUpdated: string[];
  scoreUpdated: boolean;
  stageUpdated: boolean;
}

/**
 * Enrich a lead's metadata based on the latest conversation exchange.
 * Called after every AI reply.
 */
export async function enrichLeadFromConversation(
  customerMessage: string,
  aiReply: string,
  businessId: string,
  leadId: string,
  businessType: string,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<EnrichmentResult> {
  const supabase = createAdminClient();
  const result: EnrichmentResult = { fieldsUpdated: [], scoreUpdated: false, stageUpdated: false };

  // Get current lead
  const { data: lead } = await supabase
    .from("leads")
    .select("metadata, score, status, lead_temperature")
    .eq("id", leadId)
    .single();

  if (!lead) return result;

  const currentMetadata = (lead.metadata || {}) as Record<string, unknown>;
  const config = getIndustryConfig(businessType);
  const combined = `${customerMessage}\n${aiReply}`;
  const fullHistory = conversationHistory.map((m) => m.content).join("\n") + "\n" + combined;

  // ─── 1. Extract Lead Fields ───────────────────────────────────────────
  const extractedFields: Record<string, string> = {};

  for (const field of config.leadFields) {
    // Skip if already collected
    if (currentMetadata[field.key]) continue;

    const extracted = extractFieldValue(field.key, customerMessage, fullHistory, field.options);
    if (extracted) {
      extractedFields[field.key] = extracted;
      result.fieldsUpdated.push(field.key);
    }
  }

  // ─── 2. Extract common fields (name, email) ───────────────────────────
  if (!currentMetadata.customer_email) {
    const emailMatch = customerMessage.match(/[\w.+-]+@[\w-]+\.[\w.]+/);
    if (emailMatch) {
      extractedFields.customer_email = emailMatch[0];
      result.fieldsUpdated.push("email");
    }
  }

  // ─── 3. Update metadata if fields found ───────────────────────────────
  if (result.fieldsUpdated.length > 0) {
    const newMetadata = { ...currentMetadata, ...extractedFields, last_enriched_at: new Date().toISOString() };
    await supabase.from("leads").update({ metadata: newMetadata }).eq("id", leadId);
  }

  // ─── 4. Calculate Lead Score ──────────────────────────────────────────
  const newScore = calculateLeadScore(customerMessage, aiReply, currentMetadata, extractedFields, lead.status);
  if (newScore !== lead.score) {
    const temperature = newScore >= 70 ? "hot" : newScore >= 40 ? "warm" : "cold";
    await supabase.from("leads").update({ score: newScore, lead_temperature: temperature }).eq("id", leadId);
    result.scoreUpdated = true;
  }

  // ─── 5. Auto-Update Pipeline Stage ────────────────────────────────────
  const newStage = detectStageTransition(customerMessage, aiReply, lead.status, businessType);
  if (newStage && newStage !== lead.status) {
    await supabase.from("leads").update({ status: newStage, last_activity_at: new Date().toISOString() }).eq("id", leadId);
    result.stageUpdated = true;

    // Create timeline event
    await supabase.from("lead_timeline").insert({
      business_id: businessId,
      lead_id: leadId,
      event_type: "status_change",
      description: `Stage updated: ${lead.status} → ${newStage}`,
      metadata: { from: lead.status, to: newStage, trigger: "ai_conversation" },
    }).then(() => {}, () => {}); // Non-critical, don't fail
  }

  return result;
}

// ─── Field Extraction ────────────────────────────────────────────────────────

function extractFieldValue(
  fieldKey: string,
  message: string,
  fullHistory: string,
  options?: string[]
): string | null {
  const lower = message.toLowerCase();

  switch (fieldKey) {
    case "budget":
      return extractBudget(message);
    case "location":
      return extractAfterKeywords(message, ["in ", "near ", "at ", "area ", "location "]);
    case "property_type":
      return extractFromOptions(lower, options || ["1 bhk", "2 bhk", "3 bhk", "villa", "plot", "commercial", "office"]);
    case "purpose":
      return extractFromOptions(lower, ["self-use", "investment", "rental", "living", "invest", "rent"]);
    case "fitness_goal":
      return extractFromOptions(lower, ["weight loss", "muscle gain", "general fitness", "sports", "flexibility", "bulk", "lean", "tone"]);
    case "service":
    case "treatment":
    case "concern":
      return message.length > 3 && message.length < 200 ? message.trim() : null;
    case "guest_count":
      const numMatch = message.match(/(\d+)\s*(people|persons|guests|pax|log)/i) || message.match(/\b(\d+)\b/);
      return numMatch ? numMatch[1] : null;
    case "preferred_time":
      const timeMatch = message.match(/(\d{1,2})\s*(am|pm|AM|PM)/i) || message.match(/(\d{1,2}):(\d{2})/);
      return timeMatch ? timeMatch[0] : null;
    default:
      return null;
  }
}

function extractBudget(message: string): string | null {
  // "50 lakhs", "₹50L", "$500k", "25-30 lakh", "under 50 lakh", "20 crore"
  const patterns = [
    /(\d+[\d,.]*)\s*(lakhs?|lacs?|L)\b/i,
    /(\d+[\d,.]*)\s*(crores?|cr)\b/i,
    /[₹$]\s*(\d+[\d,.]*)\s*(k|K|L|M|lakhs?|crores?)?/,
    /budget\s*(?:is|:)?\s*[₹$]?\s*(\d+[\d,.]*)/i,
    /(\d+)\s*-\s*(\d+)\s*(lakhs?|L|crores?|cr)/i,
  ];
  for (const p of patterns) {
    const match = message.match(p);
    if (match) return match[0].trim();
  }
  return null;
}

function extractAfterKeywords(message: string, keywords: string[]): string | null {
  const lower = message.toLowerCase();
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx >= 0) {
      const rest = message.substring(idx + kw.length).trim().split(/[.,!?;]/)[0].trim();
      if (rest.length > 2 && rest.length < 60) return rest;
    }
  }
  return null;
}

function extractFromOptions(message: string, options: string[]): string | null {
  for (const opt of options) {
    if (message.includes(opt.toLowerCase())) return opt;
  }
  return null;
}

// ─── Lead Scoring ────────────────────────────────────────────────────────────

function calculateLeadScore(
  customerMessage: string,
  aiReply: string,
  existingMeta: Record<string, unknown>,
  newFields: Record<string, string>,
  currentStatus: string
): number {
  let score = 0;
  const lower = customerMessage.toLowerCase();

  // Base: has engaged (messaged)
  score += 10;

  // High intent signals
  if (/\b(book|reserve|schedule|visit|join|sign up|register|enroll|buy|purchase)\b/i.test(lower)) score += 25;
  if (/\b(tomorrow|today|this week|asap|urgent|immediately|now)\b/i.test(lower)) score += 15;
  if (/\b(how much|price|cost|fee|rate|plan|package)\b/i.test(lower)) score += 10;
  if (/\b(available|slot|timing|when)\b/i.test(lower)) score += 10;

  // Data richness bonus
  const totalFields = Object.keys(existingMeta).length + Object.keys(newFields).length;
  score += Math.min(totalFields * 5, 20);

  // Status bonus
  if (currentStatus === "qualified") score += 15;
  if (currentStatus === "contacted") score += 5;

  // Booking confirmed (appointment detector ran)
  if (aiReply.toLowerCase().match(/\b(booked|confirmed|scheduled|reserved)\b/)) score += 20;

  return Math.min(score, 100);
}

// ─── Pipeline Stage Detection ────────────────────────────────────────────────

function detectStageTransition(
  customerMessage: string,
  aiReply: string,
  currentStatus: string,
  businessType: string
): string | null {
  const lower = customerMessage.toLowerCase();
  const replyLower = aiReply.toLowerCase();

  // Don't downgrade
  const statusOrder = ["new", "contacted", "qualified", "converted"];
  const currentIdx = statusOrder.indexOf(currentStatus);

  // Booking confirmed → qualified
  if (replyLower.match(/\b(booked|confirmed|scheduled|reserved|all set)\b/) && currentIdx < 2) {
    return "qualified";
  }

  // Strong buying intent → qualified
  if (/\b(i want to|i'll take|sign me up|let's do it|book it|confirm|yes please)\b/i.test(lower) && currentIdx < 2) {
    return "qualified";
  }

  // Explicit conversion signals
  if (/\b(purchased|paid|joined|enrolled|signed up|membership done)\b/i.test(lower) && currentIdx < 3) {
    return "converted";
  }

  return null;
}
