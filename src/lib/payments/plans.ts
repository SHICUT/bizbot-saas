/**
 * Plan Configuration — Single Source of Truth
 *
 * All pricing, limits, and features defined here.
 * Used by: billing page, subscription guard, API routes.
 */

export interface Plan {
  id: string;
  name: string;
  tier: "starter" | "pro" | "business";
  billingCycle: "monthly" | "yearly";
  // Pricing
  monthlyPrice: number; // ₹ per month
  yearlyPrice: number; // ₹ total per year
  yearlyMonthlyEquivalent: number; // ₹ per month when billed yearly
  priceInPaise: number; // for Razorpay (actual charge amount)
  // Limits
  messageLimit: number;
  // Display
  features: string[];
  popular?: boolean;
  tooltip?: string;
}

// ─── Plan Definitions ───────────────────────────────────────────────────────

export const PLANS: Plan[] = [
  // Starter
  {
    id: "starter_monthly",
    name: "Starter",
    tier: "starter",
    billingCycle: "monthly",
    monthlyPrice: 799,
    yearlyPrice: 7670,
    yearlyMonthlyEquivalent: 639,
    priceInPaise: 79900,
    messageLimit: 1000,
    features: [
      "1,000 messages/month",
      "AI auto-reply",
      "Lead capture",
      "Conversation inbox",
      "Email support",
    ],
  },
  {
    id: "starter_yearly",
    name: "Starter",
    tier: "starter",
    billingCycle: "yearly",
    monthlyPrice: 799,
    yearlyPrice: 7670,
    yearlyMonthlyEquivalent: 639,
    priceInPaise: 767000,
    messageLimit: 1000,
    features: [
      "1,000 messages/month",
      "AI auto-reply",
      "Lead capture",
      "Conversation inbox",
      "Email support",
      "2 months free",
    ],
  },
  // Pro
  {
    id: "pro_monthly",
    name: "Pro",
    tier: "pro",
    billingCycle: "monthly",
    monthlyPrice: 1999,
    yearlyPrice: 19190,
    yearlyMonthlyEquivalent: 1599,
    priceInPaise: 199900,
    messageLimit: 5000,
    popular: true,
    features: [
      "5,000 messages/month",
      "Everything in Starter",
      "Appointment booking",
      "Follow-up sequences",
      "Priority support",
      "Analytics dashboard",
    ],
  },
  {
    id: "pro_yearly",
    name: "Pro",
    tier: "pro",
    billingCycle: "yearly",
    monthlyPrice: 1999,
    yearlyPrice: 19190,
    yearlyMonthlyEquivalent: 1599,
    priceInPaise: 1919000,
    messageLimit: 5000,
    popular: true,
    features: [
      "5,000 messages/month",
      "Everything in Starter",
      "Appointment booking",
      "Follow-up sequences",
      "Priority support",
      "Analytics dashboard",
      "2 months free",
    ],
  },
  // Business
  {
    id: "business_monthly",
    name: "Business",
    tier: "business",
    billingCycle: "monthly",
    monthlyPrice: 3999,
    yearlyPrice: 38390,
    yearlyMonthlyEquivalent: 3199,
    priceInPaise: 399900,
    messageLimit: 20000,
    tooltip: "Designed for high-volume businesses. Fair usage limits apply.",
    features: [
      "20,000 messages/month",
      "Everything in Pro",
      "Custom AI training",
      "Multi-agent support",
      "Campaign broadcasts",
      "Dedicated account manager",
      "Fair usage policy",
    ],
  },
  {
    id: "business_yearly",
    name: "Business",
    tier: "business",
    billingCycle: "yearly",
    monthlyPrice: 3999,
    yearlyPrice: 38390,
    yearlyMonthlyEquivalent: 3199,
    priceInPaise: 3839000,
    messageLimit: 20000,
    tooltip: "Designed for high-volume businesses. Fair usage limits apply.",
    features: [
      "20,000 messages/month",
      "Everything in Pro",
      "Custom AI training",
      "Multi-agent support",
      "Campaign broadcasts",
      "Dedicated account manager",
      "Fair usage policy",
      "2 months free",
    ],
  },
];

// ─── Helper Functions ───────────────────────────────────────────────────────

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
