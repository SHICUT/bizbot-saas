/**
 * Real Estate AI Intelligence Module
 *
 * Enhances AI responses for real_estate businesses with:
 * 1. Advanced Memory — tracks preferences, objections, history
 * 2. Buyer Match Score — 0-100 compatibility scoring
 * 3. Objection Handling — human-like responses to common pushback
 * 4. Smart Upselling — suggests upgrades when budget allows
 * 5. Cross Selling — parking, club, interior, loans
 * 6. Personalized Follow-ups — context-rich re-engagement
 *
 * This module generates CONTEXT that gets injected into the AI prompt.
 * The LLM then uses this context to produce intelligent responses.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import { recommendProperties, type PropertyMatch } from "./property-recommender";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BuyerProfile {
  budget?: string;
  budgetMin?: number;
  budgetMax?: number;
  location?: string;
  bhk?: string;
  propertyType?: string;
  purpose?: string;       // self-use, investment, rental
  timeline?: string;
  loanRequired?: boolean;
  preferredPossession?: string;
  objections: string[];
  previouslyRecommended: string[];  // property names
  siteVisits: string[];             // property names visited
  favoriteProperties: string[];     // properties customer showed interest in
  conversationCount: number;
  lastContact?: string;
}

export interface BuyerMatchResult {
  score: number;
  reasons: string[];
  ranking: "excellent" | "good" | "moderate" | "low";
  recommendation: string;
}

// ─── 1. Advanced Memory — Build Buyer Profile ────────────────────────────────

/**
 * Build a complete buyer profile from lead metadata + conversation history.
 * This creates the AI's "memory" of the customer.
 */
export function buildBuyerProfile(
  leadMetadata: Record<string, unknown>,
  conversationHistory: Array<{ role: string; content: string }>
): BuyerProfile {
  const meta = leadMetadata;

  const profile: BuyerProfile = {
    budget: meta.budget as string | undefined,
    location: meta.location as string | undefined,
    bhk: meta.bhk as string | undefined,
    propertyType: meta.property_type as string | undefined,
    purpose: meta.purpose as string | undefined,
    timeline: meta.timeline as string | undefined,
    loanRequired: detectLoanInterest(conversationHistory),
    preferredPossession: meta.preferred_possession as string | undefined,
    objections: extractObjections(conversationHistory),
    previouslyRecommended: (meta.recommended_properties as string[]) || [],
    siteVisits: (meta.site_visits as string[]) || [],
    favoriteProperties: (meta.favorites as string[]) || [],
    conversationCount: conversationHistory.length,
    lastContact: meta.last_message_at as string | undefined,
  };

  // Parse budget range
  if (profile.budget) {
    const parsed = parseBudgetRange(profile.budget);
    if (parsed) {
      profile.budgetMin = parsed.min;
      profile.budgetMax = parsed.max;
    }
  }

  return profile;
}

// ─── 2. Buyer Match Score ────────────────────────────────────────────────────

/**
 * Calculate how likely this buyer is to convert, based on their profile.
 */
export function calculateBuyerMatchScore(profile: BuyerProfile): BuyerMatchResult {
  let score = 0;
  const reasons: string[] = [];

  // Has budget (20 points)
  if (profile.budget) { score += 20; reasons.push("Budget known"); }

  // Has location preference (15 points)
  if (profile.location) { score += 15; reasons.push("Location identified"); }

  // Has BHK preference (10 points)
  if (profile.bhk) { score += 10; reasons.push("BHK specified"); }

  // Purpose clarity (10 points)
  if (profile.purpose) { score += 10; reasons.push("Purpose clear"); }

  // Timeline urgency (15 points)
  if (profile.timeline) {
    const lower = profile.timeline.toLowerCase();
    if (lower.includes("immediate") || lower.includes("asap") || lower.includes("1 month")) {
      score += 15; reasons.push("Urgent timeline");
    } else if (lower.includes("3 month") || lower.includes("soon")) {
      score += 10; reasons.push("Near-term buyer");
    } else {
      score += 5; reasons.push("Has timeline");
    }
  }

  // Site visit completed (15 points)
  if (profile.siteVisits.length > 0) { score += 15; reasons.push(`${profile.siteVisits.length} site visit(s) done`); }

  // Engagement depth (10 points)
  if (profile.conversationCount > 10) { score += 10; reasons.push("Highly engaged"); }
  else if (profile.conversationCount > 5) { score += 5; reasons.push("Engaged"); }

  // Few objections = positive (5 points)
  if (profile.objections.length === 0) { score += 5; reasons.push("No objections"); }

  // Cap at 100
  score = Math.min(score, 100);

  let ranking: BuyerMatchResult["ranking"];
  let recommendation: string;

  if (score >= 75) { ranking = "excellent"; recommendation = "Push for site visit or booking immediately"; }
  else if (score >= 50) { ranking = "good"; recommendation = "Nurture with property recommendations"; }
  else if (score >= 30) { ranking = "moderate"; recommendation = "Gather more requirements"; }
  else { ranking = "low"; recommendation = "Keep in follow-up pipeline"; }

  return { score, reasons, ranking, recommendation };
}

// ─── 3. Objection Handling Context ───────────────────────────────────────────

/**
 * Generate AI instructions for handling the customer's specific objections.
 */
export function getObjectionHandlingContext(
  objections: string[],
  profile: BuyerProfile
): string {
  if (objections.length === 0) return "";

  const handlers: string[] = ["\n# OBJECTION HANDLING (customer has expressed these concerns):"];

  for (const objection of objections) {
    const response = OBJECTION_RESPONSES[objection];
    if (response) {
      handlers.push(`• "${objection}" → ${response}`);
    }
  }

  // Add budget-specific guidance
  if (objections.includes("price_too_high") && profile.budgetMax) {
    handlers.push(`\nCustomer's max budget: ₹${formatLakhs(profile.budgetMax)}. Suggest properties in their range or slightly above with EMI options.`);
  }

  handlers.push("\nIMPORTANT: Address objections naturally. Don't sound scripted. Acknowledge the concern, then provide a solution.");

  return handlers.join("\n");
}

const OBJECTION_RESPONSES: Record<string, string> = {
  "price_too_high": "Acknowledge budget concern. Mention EMI options, payment plans, or suggest a slightly smaller unit. Never dismiss their concern.",
  "need_discount": "Say you'll check with the sales team for best available offers. Mention early booking benefits or festive offers if applicable.",
  "need_loan": "Confirm bank tie-ups are available. Mention pre-approved loan options and assist with documentation. Share partner bank names if in knowledge base.",
  "need_emi": "Share EMI calculation example. Mention low-interest partner banks. Offer to connect with loan advisor.",
  "need_ready_possession": "Filter and recommend only ready-to-move properties. If none available, mention closest possession dates.",
  "need_better_location": "Ask what specific features they need (metro, school, hospital). Recommend properties matching those amenities.",
  "need_larger_bhk": "Check if budget allows upgrade. Suggest 3BHK options in same area. Mention size vs location trade-offs.",
  "need_investment_advice": "Highlight rental yield, appreciation potential, and RERA safety. Mention past appreciation data if available. Never guarantee returns.",
};

// ─── 4. Smart Upselling Context ──────────────────────────────────────────────

/**
 * Generate upselling suggestions based on customer's profile.
 */
export function getUpsellContext(
  profile: BuyerProfile,
  matches: PropertyMatch[]
): string {
  if (!profile.budgetMax || !profile.bhk) return "";

  const lines: string[] = [];

  // BHK Upgrade suggestion
  const currentBhk = parseInt(profile.bhk) || 0;
  if (currentBhk > 0 && currentBhk < 4) {
    const upgradeBhk = `${currentBhk + 1} BHK`;
    const upgradeMatches = matches.filter((m) =>
      m.property.bhk?.includes(String(currentBhk + 1)) && m.matchPercentage > 30
    );
    if (upgradeMatches.length > 0) {
      lines.push(`\n# UPSELL OPPORTUNITY: Customer wants ${profile.bhk}. ${upgradeBhk} available:`);
      for (const m of upgradeMatches.slice(0, 2)) {
        lines.push(`  • ${m.property.name} (${m.property.bhk}) — ${m.property.price_display || "Price on request"}`);
      }
      lines.push(`  Suggest ONLY if budget allows. Frame as: "For just ₹X more, you get an extra room + more space."`);
    }
  }

  // Premium floor/view upsell
  if (profile.purpose === "self-use" || profile.purpose === "Self-use") {
    lines.push(`\nIf customer shows interest, subtly mention premium options: higher floor, park-facing, corner unit.`);
  }

  return lines.join("\n");
}

// ─── 5. Cross-Selling Context ────────────────────────────────────────────────

/**
 * Generate cross-selling suggestions after primary interest is established.
 */
export function getCrossSellingContext(profile: BuyerProfile): string {
  // Only suggest add-ons when customer is in advanced stages
  if (profile.conversationCount < 5 && profile.siteVisits.length === 0) return "";

  const suggestions: string[] = ["\n# CROSS-SELL (mention naturally, don't push):"];

  if (profile.purpose === "self-use" || profile.purpose === "Self-use") {
    suggestions.push("• Parking: Additional car parking slots available");
    suggestions.push("• Club Membership: Clubhouse membership with gym, pool access");
    suggestions.push("• Interior Package: Tie-up with interior designers — turnkey ready");
    suggestions.push("• Furniture Package: Modular kitchen + wardrobes package available");
  }

  if (profile.loanRequired) {
    suggestions.push("• Home Loan: Pre-approved loan partners with special rates");
    suggestions.push("• Insurance: Home insurance tie-up for loan protection");
  }

  suggestions.push("\nONLY mention if relevant to the conversation. Don't list all at once.");
  return suggestions.join("\n");
}

// ─── 6. Personalized Follow-up Generator ─────────────────────────────────────

/**
 * Generate personalized follow-up message based on buyer profile.
 * Used by the follow-up automation engine.
 */
export function generatePersonalizedFollowUp(
  profile: BuyerProfile,
  step: number,
  businessName: string
): string {
  const name = ""; // Will be prepended by caller

  if (profile.siteVisits.length > 0) {
    const lastVisit = profile.siteVisits[profile.siteVisits.length - 1];
    if (step === 0) return `Hope you liked your visit to ${lastVisit}! 🏠\n\nWould you like to discuss the payment plan or schedule another visit?`;
    if (step === 1) return `Quick update — there's been a lot of interest in ${lastVisit} this week.\n\nShall I check the latest availability for you?`;
    return `Hi! Just checking in. If you're still interested in ${lastVisit}, I can arrange a call with our sales head for the best deal. Let me know! 🙏`;
  }

  if (profile.budget && profile.location) {
    if (step === 0) return `Hi! Following up on your search for a property in ${profile.location} (budget: ${profile.budget}).\n\nWe have a few new options — shall I share?`;
    if (step === 1) return `We've got some exciting new launches in ${profile.location} within your budget.\n\nWould you like me to send details or schedule a visit?`;
    return `Hi! The ${profile.location} market is moving fast. Some units in your budget range are getting booked.\n\nWant me to check availability? No pressure at all! 🏠`;
  }

  if (profile.favoriteProperties.length > 0) {
    return `Hi! Checking in about ${profile.favoriteProperties[0]}. Any questions I can help with?\n\nI can also arrange a virtual tour if an in-person visit is difficult. 📱`;
  }

  // Generic but personalized
  if (step === 0) return `Hi! Just following up on your property inquiry with ${businessName}.\n\nHave your requirements changed, or can I help with anything?`;
  return `Hi! Hope you're doing well. If you're still exploring properties, I'm here to help.\n\nNo pressure — just want to make sure you don't miss any good deals! 🏠`;
}

// ─── Master Context Builder ──────────────────────────────────────────────────

/**
 * Build the complete AI intelligence context for a real estate conversation.
 * This is injected into the system prompt alongside property recommendations.
 */
export async function buildIntelligenceContext(
  businessId: string,
  leadMetadata: Record<string, unknown>,
  conversationHistory: Array<{ role: string; content: string }>
): Promise<string> {
  const profile = buildBuyerProfile(leadMetadata, conversationHistory);
  const matchScore = calculateBuyerMatchScore(profile);

  // Get property recommendations for upselling context
  let matches: PropertyMatch[] = [];
  if (profile.budget || profile.location || profile.bhk) {
    const { recommendProperties: recommend } = await import("./property-recommender");
    matches = await recommend(businessId, {
      budget: profile.budget,
      location: profile.location,
      bhk: profile.bhk ? String(parseInt(profile.bhk) + 1) + "BHK" : undefined, // For upsell
      propertyType: profile.propertyType,
    }, 3);
  }

  const sections: string[] = [];

  // Buyer score context
  sections.push(`\n# BUYER INTELLIGENCE`);
  sections.push(`Buyer Score: ${matchScore.score}/100 (${matchScore.ranking})`);
  sections.push(`Strategy: ${matchScore.recommendation}`);
  if (profile.previouslyRecommended.length > 0) {
    sections.push(`Already recommended: ${profile.previouslyRecommended.join(", ")}`);
  }
  if (profile.siteVisits.length > 0) {
    sections.push(`Site visits done: ${profile.siteVisits.join(", ")}`);
  }

  // Objection handling
  const objectionCtx = getObjectionHandlingContext(profile.objections, profile);
  if (objectionCtx) sections.push(objectionCtx);

  // Upselling
  const upsellCtx = getUpsellContext(profile, matches);
  if (upsellCtx) sections.push(upsellCtx);

  // Cross-selling
  const crossCtx = getCrossSellingContext(profile);
  if (crossCtx) sections.push(crossCtx);

  return sections.join("\n");
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractObjections(history: Array<{ role: string; content: string }>): string[] {
  const objections: string[] = [];
  const customerMessages = history.filter((m) => m.role === "user").map((m) => m.content.toLowerCase());
  const combined = customerMessages.join(" ");

  if (/\b(expensive|costly|high price|over budget|too much|zyada|mahanga)\b/.test(combined)) objections.push("price_too_high");
  if (/\b(discount|offer|less price|kam|special rate)\b/.test(combined)) objections.push("need_discount");
  if (/\b(loan|finance|bank|emi|monthly)\b/.test(combined)) objections.push("need_loan");
  if (/\b(emi|installment|monthly payment|kitni emi)\b/.test(combined)) objections.push("need_emi");
  if (/\b(ready|immediate|move in now|jaldi|abhi)\b/.test(combined)) objections.push("need_ready_possession");
  if (/\b(better location|far|too far|conveyance|commute)\b/.test(combined)) objections.push("need_better_location");
  if (/\b(bigger|larger|more space|3bhk|4bhk|bada)\b/.test(combined)) objections.push("need_larger_bhk");
  if (/\b(investment|roi|return|appreciation|rental income)\b/.test(combined)) objections.push("need_investment_advice");

  return [...new Set(objections)];
}

function detectLoanInterest(history: Array<{ role: string; content: string }>): boolean {
  const combined = history.filter((m) => m.role === "user").map((m) => m.content).join(" ").toLowerCase();
  return /\b(loan|emi|finance|bank|monthly payment|installment)\b/.test(combined);
}

function parseBudgetRange(budget: string): { min: number; max: number } | null {
  const lower = budget.toLowerCase().replace(/,/g, "");
  const rangeMatch = lower.match(/(\d+\.?\d*)\s*[-–to]+\s*(\d+\.?\d*)\s*(lakh|lac|l|crore|cr)/i);
  if (rangeMatch) {
    const mult = /crore|cr/i.test(rangeMatch[3]) ? 10000000 : 100000;
    return { min: parseFloat(rangeMatch[1]) * mult, max: parseFloat(rangeMatch[2]) * mult };
  }
  const singleMatch = lower.match(/(\d+\.?\d*)\s*(lakh|lac|l|crore|cr)/i);
  if (singleMatch) {
    const mult = /crore|cr/i.test(singleMatch[2]) ? 10000000 : 100000;
    const val = parseFloat(singleMatch[1]) * mult;
    return { min: val * 0.8, max: val * 1.2 };
  }
  return null;
}

function formatLakhs(value: number): string {
  if (value >= 10000000) return `${(value / 10000000).toFixed(1)} Cr`;
  if (value >= 100000) return `${(value / 100000).toFixed(0)} Lakh`;
  return value.toLocaleString("en-IN");
}
