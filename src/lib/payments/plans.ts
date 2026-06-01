/**
 * PRICING CONFIGURATION — Single Source of Truth
 *
 * ⚠️ TESTING MODE: ₹10/₹20/₹30
 * To restore production pricing, change TESTING_MODE to false.
 */

const TESTING_MODE = false; // ← Set to true for ₹10/₹20/₹30 testing

// ─── Production Pricing ─────────────────────────────────────────────────────
const PRODUCTION_PRICES = {
  starter: { monthly: 799, yearly: 7670, yearlyEquivalent: 639 },
  pro: { monthly: 1999, yearly: 19190, yearlyEquivalent: 1599 },
  business: { monthly: 3999, yearly: 38390, yearlyEquivalent: 3199 },
};

// ─── Testing Pricing ────────────────────────────────────────────────────────
const TESTING_PRICES = {
  starter: { monthly: 10, yearly: 100, yearlyEquivalent: 8 },
  pro: { monthly: 20, yearly: 200, yearlyEquivalent: 17 },
  business: { monthly: 30, yearly: 300, yearlyEquivalent: 25 },
};

const PRICES = TESTING_MODE ? TESTING_PRICES : PRODUCTION_PRICES;

// ─── Plan Definitions ───────────────────────────────────────────────────────

export interface Plan {
  id: string;
  name: string;
  tier: "starter" | "pro" | "business";
  billingCycle: "monthly" | "yearly";
  monthlyPrice: number;
  yearlyPrice: number;
  yearlyMonthlyEquivalent: number;
  priceInPaise: number;
  messageLimit: number;
  features: string[];
  popular?: boolean;
}

export const PLANS: Plan[] = [
  {
    id: "starter_monthly", name: "Starter", tier: "starter", billingCycle: "monthly",
    monthlyPrice: PRICES.starter.monthly,
    yearlyPrice: PRICES.starter.yearly,
    yearlyMonthlyEquivalent: PRICES.starter.yearlyEquivalent,
    priceInPaise: PRICES.starter.monthly * 100,
    messageLimit: 1000,
    features: ["1,000 messages/month", "AI auto-reply", "Lead capture", "Conversation inbox", "Email support"],
  },
  {
    id: "starter_yearly", name: "Starter", tier: "starter", billingCycle: "yearly",
    monthlyPrice: PRICES.starter.monthly,
    yearlyPrice: PRICES.starter.yearly,
    yearlyMonthlyEquivalent: PRICES.starter.yearlyEquivalent,
    priceInPaise: PRICES.starter.yearly * 100,
    messageLimit: 1000,
    features: ["1,000 messages/month", "AI auto-reply", "Lead capture", "Conversation inbox", "Email support", "2 months free"],
  },
  {
    id: "pro_monthly", name: "Pro", tier: "pro", billingCycle: "monthly",
    monthlyPrice: PRICES.pro.monthly,
    yearlyPrice: PRICES.pro.yearly,
    yearlyMonthlyEquivalent: PRICES.pro.yearlyEquivalent,
    priceInPaise: PRICES.pro.monthly * 100,
    messageLimit: 5000, popular: true,
    features: ["5,000 messages/month", "Everything in Starter", "Appointment booking", "Follow-up sequences", "Priority support", "Analytics dashboard"],
  },
  {
    id: "pro_yearly", name: "Pro", tier: "pro", billingCycle: "yearly",
    monthlyPrice: PRICES.pro.monthly,
    yearlyPrice: PRICES.pro.yearly,
    yearlyMonthlyEquivalent: PRICES.pro.yearlyEquivalent,
    priceInPaise: PRICES.pro.yearly * 100,
    messageLimit: 5000, popular: true,
    features: ["5,000 messages/month", "Everything in Starter", "Appointment booking", "Follow-up sequences", "Priority support", "Analytics dashboard", "2 months free"],
  },
  {
    id: "business_monthly", name: "Business", tier: "business", billingCycle: "monthly",
    monthlyPrice: PRICES.business.monthly,
    yearlyPrice: PRICES.business.yearly,
    yearlyMonthlyEquivalent: PRICES.business.yearlyEquivalent,
    priceInPaise: PRICES.business.monthly * 100,
    messageLimit: 20000,
    features: ["20,000 messages/month", "Everything in Pro", "Custom AI training", "Multi-agent support", "Campaign broadcasts", "Dedicated account manager"],
  },
  {
    id: "business_yearly", name: "Business", tier: "business", billingCycle: "yearly",
    monthlyPrice: PRICES.business.monthly,
    yearlyPrice: PRICES.business.yearly,
    yearlyMonthlyEquivalent: PRICES.business.yearlyEquivalent,
    priceInPaise: PRICES.business.yearly * 100,
    messageLimit: 20000,
    features: ["20,000 messages/month", "Everything in Pro", "Custom AI training", "Multi-agent support", "Campaign broadcasts", "Dedicated account manager", "2 months free"],
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
  return TESTING_MODE;
}
