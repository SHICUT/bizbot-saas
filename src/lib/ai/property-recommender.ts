/**
 * Property Recommendation Engine
 *
 * Matches customer requirements against the properties database.
 * Returns ranked results with match percentage and reasons.
 *
 * Used by:
 * - AI conversation (auto-recommend when requirements are known)
 * - API endpoint (manual search by sales team)
 */

import { createAdminClient } from "@/lib/supabase/admin";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CustomerRequirements {
  budget?: string;       // "50 lakhs", "₹1 crore", "40-60 lakh"
  location?: string;     // "Dwarka", "Sector 150"
  propertyType?: string; // "flat", "villa", "plot"
  bhk?: string;          // "2BHK", "3BHK"
  purpose?: string;      // "self-use", "investment"
  timeline?: string;     // "immediate", "6 months"
}

export interface PropertyMatch {
  id: string;
  name: string;
  matchPercentage: number;
  matchReasons: string[];
  property: PropertyRecord;
}

interface PropertyRecord {
  id: string;
  name: string;
  property_type: string;
  bhk: string | null;
  price_min: number | null;
  price_max: number | null;
  price_display: string | null;
  city: string | null;
  area: string | null;
  address: string | null;
  status: string;
  possession_date: string | null;
  amenities: string[];
  images: Array<{ url: string; caption?: string }>;
  floor_plans: Array<{ url: string; caption?: string }>;
  brochure_url: string | null;
  google_maps_link: string | null;
  latitude: number | null;
  longitude: number | null;
  highlights: string[];
  description: string | null;
  rera_number: string | null;
  builder_name: string | null;
}

// ─── Main Recommendation Function ───────────────────────────────────────────

/**
 * Find matching properties for a customer's requirements.
 * Returns sorted by match percentage (highest first).
 */
export async function recommendProperties(
  businessId: string,
  requirements: CustomerRequirements,
  limit: number = 5
): Promise<PropertyMatch[]> {
  const supabase = createAdminClient();

  // Load all available properties for this business
  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .in("status", ["available", "upcoming"])
    .order("sort_order");

  if (!properties || properties.length === 0) return [];

  // Score each property against requirements
  const scored: PropertyMatch[] = properties.map((prop) => {
    const { score, reasons } = calculateMatchScore(prop, requirements);
    return {
      id: prop.id,
      name: prop.name,
      matchPercentage: score,
      matchReasons: reasons,
      property: prop as PropertyRecord,
    };
  });

  // Sort by match percentage descending, return top N
  return scored
    .filter((m) => m.matchPercentage > 0)
    .sort((a, b) => b.matchPercentage - a.matchPercentage)
    .slice(0, limit);
}

// ─── Scoring Logic ──────────────────────────────────────────────────────────

function calculateMatchScore(
  property: Record<string, unknown>,
  req: CustomerRequirements
): { score: number; reasons: string[] } {
  let totalWeight = 0;
  let earnedWeight = 0;
  const reasons: string[] = [];

  // Budget match (weight: 30)
  if (req.budget) {
    totalWeight += 30;
    const budgetRange = parseBudget(req.budget);
    const propMin = property.price_min as number | null;
    const propMax = property.price_max as number | null;

    if (budgetRange && (propMin || propMax)) {
      const propPrice = propMax || propMin || 0;
      if (propPrice >= budgetRange.min * 0.8 && propPrice <= budgetRange.max * 1.2) {
        earnedWeight += 30;
        reasons.push("Budget Match");
      } else if (propPrice >= budgetRange.min * 0.6 && propPrice <= budgetRange.max * 1.5) {
        earnedWeight += 15;
        reasons.push("Near Budget");
      }
    }
  }

  // Location match (weight: 25)
  if (req.location) {
    totalWeight += 25;
    const loc = req.location.toLowerCase();
    const propCity = ((property.city as string) || "").toLowerCase();
    const propArea = ((property.area as string) || "").toLowerCase();
    const propAddress = ((property.address as string) || "").toLowerCase();

    if (propArea.includes(loc) || loc.includes(propArea)) {
      earnedWeight += 25;
      reasons.push("Location Match");
    } else if (propCity.includes(loc) || loc.includes(propCity)) {
      earnedWeight += 20;
      reasons.push("City Match");
    } else if (propAddress.includes(loc)) {
      earnedWeight += 15;
      reasons.push("Near Location");
    }
  }

  // Property type match (weight: 20)
  if (req.propertyType) {
    totalWeight += 20;
    const reqType = req.propertyType.toLowerCase();
    const propType = ((property.property_type as string) || "").toLowerCase();

    if (propType === reqType || propType.includes(reqType) || reqType.includes(propType)) {
      earnedWeight += 20;
      reasons.push("Type Match");
    }
  }

  // BHK match (weight: 15)
  if (req.bhk) {
    totalWeight += 15;
    const reqBhk = req.bhk.toLowerCase().replace(/\s/g, "");
    const propBhk = ((property.bhk as string) || "").toLowerCase().replace(/\s/g, "");

    if (propBhk === reqBhk || propBhk.includes(reqBhk) || reqBhk.includes(propBhk)) {
      earnedWeight += 15;
      reasons.push("BHK Match");
    }
  }

  // Availability bonus (weight: 10)
  totalWeight += 10;
  if (property.status === "available") {
    earnedWeight += 10;
    reasons.push("Available Now");
  } else if (property.status === "upcoming") {
    earnedWeight += 5;
    reasons.push("Upcoming");
  }

  // Timeline/possession match (bonus)
  if (req.timeline && property.possession_date) {
    const timeline = req.timeline.toLowerCase();
    if (timeline.includes("immediate") || timeline.includes("ready")) {
      if (((property.possession_date as string) || "").toLowerCase().includes("ready")) {
        reasons.push("Ready Possession");
      }
    }
  }

  // Calculate percentage
  const percentage = totalWeight > 0 ? Math.round((earnedWeight / totalWeight) * 100) : 0;

  return { score: percentage, reasons };
}

// ─── Budget Parser ──────────────────────────────────────────────────────────

function parseBudget(budgetStr: string): { min: number; max: number } | null {
  const lower = budgetStr.toLowerCase().replace(/,/g, "");

  // Range: "40-60 lakh" or "1-2 crore"
  const rangeMatch = lower.match(/(\d+\.?\d*)\s*[-–to]+\s*(\d+\.?\d*)\s*(lakh|lac|l|crore|cr)/i);
  if (rangeMatch) {
    const multiplier = /crore|cr/i.test(rangeMatch[3]) ? 10000000 : 100000;
    return {
      min: parseFloat(rangeMatch[1]) * multiplier,
      max: parseFloat(rangeMatch[2]) * multiplier,
    };
  }

  // Single value: "50 lakh", "1.5 crore", "₹45L"
  const singleMatch = lower.match(/(\d+\.?\d*)\s*(lakh|lac|l|crore|cr)/i);
  if (singleMatch) {
    const multiplier = /crore|cr/i.test(singleMatch[2]) ? 10000000 : 100000;
    const value = parseFloat(singleMatch[1]) * multiplier;
    return { min: value * 0.8, max: value * 1.2 }; // ±20% range
  }

  // Plain number (assume lakhs if > 10, crores if mentioned)
  const numMatch = lower.match(/(\d+\.?\d*)/);
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    if (val > 100) {
      // Likely lakhs (e.g., "4500000")
      return { min: val * 0.8, max: val * 1.2 };
    }
  }

  return null;
}

// ─── Format Recommendation for AI Response ──────────────────────────────────

/**
 * Format property matches into a concise WhatsApp-friendly text
 * that the AI can include in its response.
 */
export function formatRecommendationsForAI(matches: PropertyMatch[]): string {
  if (matches.length === 0) return "";

  const lines: string[] = ["Based on your requirements, here are my recommendations:\n"];

  for (const match of matches.slice(0, 3)) {
    const p = match.property;
    lines.push(`🏠 *${p.name}*`);
    if (p.bhk) lines.push(`   ${p.bhk} ${p.property_type}`);
    if (p.price_display) lines.push(`   💰 ${p.price_display}`);
    if (p.area || p.city) lines.push(`   📍 ${[p.area, p.city].filter(Boolean).join(", ")}`);
    if (p.possession_date) lines.push(`   📅 Possession: ${p.possession_date}`);
    lines.push(`   ✅ ${match.matchPercentage}% match — ${match.matchReasons.join(", ")}`);
    lines.push("");
  }

  lines.push("Would you like details on any of these, or shall I book a site visit?");
  return lines.join("\n");
}
