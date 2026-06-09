/**
 * PRICING CONFIGURATION — Single Source of Truth
 * All prices are in USD.
 * Payment processing uses USD cents.
 *
 * Yearly plans get 20% discount automatically.
 * Additional discounts can be applied via coupon codes.
 */

/** Trial duration in days — SINGLE SOURCE OF TRUTH */
export const TRIAL_DURATION_DAYS = 7;

// ─── Plan Pricing (USD) ─────────────────────────────────────────────────────

export const PRICES = {
  starter: { monthly: 19, yearly: 182 },  // $19/mo, $182/yr (20% off)
  growth: { monthly: 49, yearly: 470 },   // $49/mo, $470/yr (20% off)
  business: { monthly: 99, yearly: 950 }, // $99/mo, $950/yr (20% off)
};

/** Yearly discount percentage */
export const YEARLY_DISCOUNT_PERCENT = 20;

/**
 * Convert USD to cents (smallest unit for payment processing)
 */
export function usdToCents(usd: number): number {
  return Math.round(usd * 100);
}

// ─── Plan Definitions ───────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  tier: "starter" | "growth" | "business";
  billingCycle: "monthly" | "yearly";
  monthlyPrice: number;          // USD per month
  yearlyPrice: number;           // USD total per year
  yearlyMonthlyEquivalent: number; // USD effective monthly when billed yearly
  yearlySavings: number;         // USD saved per year vs monthly
  priceInCents: number;          // USD cents (charge amount)
  priceUSD: number;              // USD (charge amount for this billing entry)
  messageLimit: number;          // AI replies per month
  features: string[];
  popular?: boolean;
  tagline?: string;
}

export const PLANS: Plan[] = [
  // ─── Starter ────────────────────────────────────────────────────────────
  {
    id: "starter_monthly", name: "Starter", tier: "starter", billingCycle: "monthly",
    monthlyPrice: PRICES.starter.monthly,
    yearlyPrice: PRICES.starter.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.starter.yearly / 12) * 100) / 100,
    yearlySavings: (PRICES.starter.monthly * 12) - PRICES.starter.yearly,
    priceInCents: usdToCents(PRICES.starter.monthly),
    priceUSD: PRICES.starter.monthly,
    messageLimit: 1000,
    features: ["1K AI Replies/month", "AI Auto Reply", "Knowledge Base", "Conversations Inbox", "Leads CRM", "Media Library", "Basic Analytics", "AI Readiness"],
  },
  {
    id: "starter_yearly", name: "Starter", tier: "starter", billingCycle: "yearly",
    monthlyPrice: PRICES.starter.monthly,
    yearlyPrice: PRICES.starter.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.starter.yearly / 12) * 100) / 100,
    yearlySavings: (PRICES.starter.monthly * 12) - PRICES.starter.yearly,
    priceInCents: usdToCents(PRICES.starter.yearly),
    priceUSD: PRICES.starter.yearly,
    messageLimit: 1000,
    features: ["1K AI Replies/month", "AI Auto Reply", "Knowledge Base", "Conversations Inbox", "Leads CRM", "Media Library", "Basic Analytics", "AI Readiness"],
  },
  // ─── Growth ─────────────────────────────────────────────────────────────
  {
    id: "growth_monthly", name: "Growth", tier: "growth", billingCycle: "monthly",
    monthlyPrice: PRICES.growth.monthly,
    yearlyPrice: PRICES.growth.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.growth.yearly / 12) * 100) / 100,
    yearlySavings: (PRICES.growth.monthly * 12) - PRICES.growth.yearly,
    priceInCents: usdToCents(PRICES.growth.monthly),
    priceUSD: PRICES.growth.monthly,
    messageLimit: 5000, popular: true, tagline: "Most Popular",
    features: ["5K AI Replies/month", "Everything in Starter", "Broadcast Campaigns", "AI Follow-Up Automation", "Appointments", "Revenue Dashboard", "Lead Scoring", "Advanced CRM", "CSV Export"],
  },
  {
    id: "growth_yearly", name: "Growth", tier: "growth", billingCycle: "yearly",
    monthlyPrice: PRICES.growth.monthly,
    yearlyPrice: PRICES.growth.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.growth.yearly / 12) * 100) / 100,
    yearlySavings: (PRICES.growth.monthly * 12) - PRICES.growth.yearly,
    priceInCents: usdToCents(PRICES.growth.yearly),
    priceUSD: PRICES.growth.yearly,
    messageLimit: 5000, popular: true, tagline: "Most Popular",
    features: ["5K AI Replies/month", "Everything in Starter", "Broadcast Campaigns", "AI Follow-Up Automation", "Appointments", "Revenue Dashboard", "Lead Scoring", "Advanced CRM", "CSV Export"],
  },
  // ─── Business ───────────────────────────────────────────────────────────
  {
    id: "business_monthly", name: "Business", tier: "business", billingCycle: "monthly",
    monthlyPrice: PRICES.business.monthly,
    yearlyPrice: PRICES.business.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.business.yearly / 12) * 100) / 100,
    yearlySavings: (PRICES.business.monthly * 12) - PRICES.business.yearly,
    priceInCents: usdToCents(PRICES.business.monthly),
    priceUSD: PRICES.business.monthly,
    messageLimit: 20000, tagline: "Best for Scale",
    features: ["20K AI Replies/month", "Everything in Growth", "AI Sales Employee", "Multi-Agent Access", "Advanced Analytics", "Revenue Attribution", "Campaign Analytics", "WhatsApp Compliance Tools"],
  },
  {
    id: "business_yearly", name: "Business", tier: "business", billingCycle: "yearly",
    monthlyPrice: PRICES.business.monthly,
    yearlyPrice: PRICES.business.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.business.yearly / 12) * 100) / 100,
    yearlySavings: (PRICES.business.monthly * 12) - PRICES.business.yearly,
    priceInCents: usdToCents(PRICES.business.yearly),
    priceUSD: PRICES.business.yearly,
    messageLimit: 20000, tagline: "Best for Scale",
    features: ["20K AI Replies/month", "Everything in Growth", "AI Sales Employee", "Multi-Agent Access", "Advanced Analytics", "Revenue Attribution", "Campaign Analytics", "WhatsApp Compliance Tools"],
  },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id);
}

export function getPlansByBillingCycle(cycle: "monthly" | "yearly"): Plan[] {
  return PLANS.filter((p) => p.billingCycle === cycle);
}

export function getMonthlyPlans(): Plan[] {
  return PLANS.filter((p) => p.billingCycle === "monthly");
}

export function getYearlyPlans(): Plan[] {
  return PLANS.filter((p) => p.billingCycle === "yearly");
}

export function getPlansByTier(tier: string): Plan[] {
  return PLANS.filter((p) => p.tier === tier);
}

export function isTestingMode(): boolean {
  return false;
}

/** AI reply limits by plan tier */
export const MESSAGE_LIMITS: Record<string, number> = {
  trial: 100,
  starter: 1000,
  growth: 5000,
  business: 20000,
};
