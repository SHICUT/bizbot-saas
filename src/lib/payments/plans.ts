/**
 * PRICING CONFIGURATION — Single Source of Truth
 * Display Currency: USD
 * Payment Currency: INR (Razorpay only supports INR)
 * Exchange Rate: Fixed at ₹85 per $1 (update periodically)
 */

/** Trial duration in days — SINGLE SOURCE OF TRUTH */
export const TRIAL_DURATION_DAYS = 7;

/** USD to INR exchange rate (update this value periodically) */
export const USD_TO_INR = 85;

// ─── Plan Pricing ────────────────────────────────────────────────────────────

export const PRICES = {
  starter: { monthly: 9, yearly: 79, yearlySavings: 29 },
  growth: { monthly: 19, yearly: 179, yearlySavings: 49 },
  business: { monthly: 39, yearly: 349, yearlySavings: 119 },
};

/**
 * Convert USD to INR paise for Razorpay
 * Razorpay requires amount in smallest currency unit (paise = INR × 100)
 */
export function usdToInrPaise(usd: number): number {
  return Math.round(usd * USD_TO_INR * 100);
}

/** Convert USD to INR (for display) */
export function usdToInr(usd: number): number {
  return Math.round(usd * USD_TO_INR);
}

// ─── Plan Definitions ───────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  tier: "starter" | "growth" | "business";
  billingCycle: "monthly" | "yearly";
  monthlyPrice: number; // USD
  yearlyPrice: number; // USD
  yearlyMonthlyEquivalent: number; // USD
  yearlySavings: number; // USD
  priceInCents: number; // USD cents (for display)
  priceInPaise: number; // INR paise (for Razorpay checkout)
  priceINR: number; // INR rounded (for display at checkout)
  messageLimit: number;
  features: string[];
  popular?: boolean;
  tagline?: string;
}

export const PLANS: Plan[] = [
  // Starter Monthly
  {
    id: "starter_monthly", name: "Starter", tier: "starter", billingCycle: "monthly",
    monthlyPrice: PRICES.starter.monthly, yearlyPrice: PRICES.starter.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.starter.yearly / 12) * 100) / 100,
    yearlySavings: PRICES.starter.yearlySavings,
    priceInCents: PRICES.starter.monthly * 100,
    priceInPaise: usdToInrPaise(PRICES.starter.monthly),
    priceINR: usdToInr(PRICES.starter.monthly),
    messageLimit: 1000,
    features: ["AI Auto Reply", "Knowledge Base", "Conversations Inbox", "Leads CRM", "Media Library", "Basic Analytics", "AI Readiness", "1,000 Messages/month"],
  },
  // Starter Yearly
  {
    id: "starter_yearly", name: "Starter", tier: "starter", billingCycle: "yearly",
    monthlyPrice: PRICES.starter.monthly, yearlyPrice: PRICES.starter.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.starter.yearly / 12) * 100) / 100,
    yearlySavings: PRICES.starter.yearlySavings,
    priceInCents: PRICES.starter.yearly * 100,
    priceInPaise: usdToInrPaise(PRICES.starter.yearly),
    priceINR: usdToInr(PRICES.starter.yearly),
    messageLimit: 1000,
    features: ["AI Auto Reply", "Knowledge Base", "Conversations Inbox", "Leads CRM", "Media Library", "Basic Analytics", "AI Readiness", "1,000 Messages/month"],
  },
  // Growth Monthly
  {
    id: "growth_monthly", name: "Growth", tier: "growth", billingCycle: "monthly",
    monthlyPrice: PRICES.growth.monthly, yearlyPrice: PRICES.growth.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.growth.yearly / 12) * 100) / 100,
    yearlySavings: PRICES.growth.yearlySavings,
    priceInCents: PRICES.growth.monthly * 100,
    priceInPaise: usdToInrPaise(PRICES.growth.monthly),
    priceINR: usdToInr(PRICES.growth.monthly),
    messageLimit: 5000, popular: true, tagline: "Most Popular",
    features: ["Everything in Starter", "Broadcast Campaigns", "AI Follow-Up Automation", "Appointments", "Revenue Dashboard", "Lead Scoring", "Advanced CRM", "CSV Export", "5,000 Messages/month"],
  },
  // Growth Yearly
  {
    id: "growth_yearly", name: "Growth", tier: "growth", billingCycle: "yearly",
    monthlyPrice: PRICES.growth.monthly, yearlyPrice: PRICES.growth.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.growth.yearly / 12) * 100) / 100,
    yearlySavings: PRICES.growth.yearlySavings,
    priceInCents: PRICES.growth.yearly * 100,
    priceInPaise: usdToInrPaise(PRICES.growth.yearly),
    priceINR: usdToInr(PRICES.growth.yearly),
    messageLimit: 5000, popular: true, tagline: "Most Popular",
    features: ["Everything in Starter", "Broadcast Campaigns", "AI Follow-Up Automation", "Appointments", "Revenue Dashboard", "Lead Scoring", "Advanced CRM", "CSV Export", "5,000 Messages/month"],
  },
  // Business Monthly
  {
    id: "business_monthly", name: "Business", tier: "business", billingCycle: "monthly",
    monthlyPrice: PRICES.business.monthly, yearlyPrice: PRICES.business.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.business.yearly / 12) * 100) / 100,
    yearlySavings: PRICES.business.yearlySavings,
    priceInCents: PRICES.business.monthly * 100,
    priceInPaise: usdToInrPaise(PRICES.business.monthly),
    priceINR: usdToInr(PRICES.business.monthly),
    messageLimit: 20000, tagline: "Best for Growing Businesses",
    features: ["Everything in Growth", "AI Sales Employee", "Multi-Agent Access", "Advanced Analytics", "Revenue Attribution", "Campaign Analytics", "WhatsApp Compliance Tools", "20,000 Messages/month"],
  },
  // Business Yearly
  {
    id: "business_yearly", name: "Business", tier: "business", billingCycle: "yearly",
    monthlyPrice: PRICES.business.monthly, yearlyPrice: PRICES.business.yearly,
    yearlyMonthlyEquivalent: Math.round((PRICES.business.yearly / 12) * 100) / 100,
    yearlySavings: PRICES.business.yearlySavings,
    priceInCents: PRICES.business.yearly * 100,
    priceInPaise: usdToInrPaise(PRICES.business.yearly),
    priceINR: usdToInr(PRICES.business.yearly),
    messageLimit: 20000, tagline: "Best for Growing Businesses",
    features: ["Everything in Growth", "AI Sales Employee", "Multi-Agent Access", "Advanced Analytics", "Revenue Attribution", "Campaign Analytics", "WhatsApp Compliance Tools", "20,000 Messages/month"],
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

/** Message limits by plan tier */
export const MESSAGE_LIMITS: Record<string, number> = {
  trial: 100,
  starter: 1000,
  growth: 5000,
  business: 20000,
};
