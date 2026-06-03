import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Enterprise-Grade Subscription Guard
 *
 * Validates subscription status and feature access server-side.
 * NEVER trust frontend checks — all enforcement happens here.
 */

// ─── Feature Definitions Per Plan ───────────────────────────────────────────

export interface FeatureAccess {
  aiReply: boolean;
  leadCapture: boolean;
  conversationInbox: boolean;
  appointmentBooking: boolean;
  followUpSequences: boolean;
  analytics: boolean;
  customAiTraining: boolean;
  multiAgent: boolean;
  campaigns: boolean;
  prioritySupport: boolean;
}

const PLAN_FEATURES: Record<string, FeatureAccess> = {
  trial: {
    aiReply: true, leadCapture: true, conversationInbox: true,
    appointmentBooking: false, followUpSequences: false, analytics: false,
    customAiTraining: false, multiAgent: false, campaigns: false, prioritySupport: false,
  },
  starter: {
    aiReply: true, leadCapture: true, conversationInbox: true,
    appointmentBooking: false, followUpSequences: false, analytics: true,
    customAiTraining: false, multiAgent: false, campaigns: false, prioritySupport: false,
  },
  growth: {
    aiReply: true, leadCapture: true, conversationInbox: true,
    appointmentBooking: true, followUpSequences: true, analytics: true,
    customAiTraining: false, multiAgent: false, campaigns: true, prioritySupport: true,
  },
  business: {
    aiReply: true, leadCapture: true, conversationInbox: true,
    appointmentBooking: true, followUpSequences: true, analytics: true,
    customAiTraining: true, multiAgent: true, campaigns: true, prioritySupport: true,
  },
};

const PLAN_MESSAGE_LIMITS: Record<string, number> = {
  trial: 100,
  starter: 1000,
  growth: 5000,
  business: 20000,
};

// ─── Subscription Status ────────────────────────────────────────────────────

export interface SubscriptionStatus {
  isActive: boolean;
  isExpired: boolean;
  isTrialing: boolean;
  plan: string;
  status: string;
  messagesUsed: number;
  messageLimit: number;
  messagesRemaining: number;
  canSendMessage: boolean;
  trialDaysRemaining: number | null;
  expiresAt: string | null;
  features: FeatureAccess;
}

/**
 * Get full subscription status for a business.
 * Server-side only — validates against database.
 */
export async function getSubscriptionStatus(businessId: string): Promise<SubscriptionStatus> {
  const supabase = createAdminClient();

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("business_id", businessId)
    .in("status", ["active", "trialing", "past_due"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!subscription) {
    console.log("[SubGuard] No subscription for business:", businessId);
    return getExpiredStatus();
  }

  const now = new Date();
  const periodEnd = subscription.current_period_end ? new Date(subscription.current_period_end) : null;
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
  const isExpired = periodEnd ? periodEnd < now : false;
  const isTrialing = subscription.status === "trialing";
  const isActive = !isExpired && ["active", "trialing"].includes(subscription.status);

  const plan = subscription.plan || "trial";
  const messageLimit = PLAN_MESSAGE_LIMITS[plan] || 1000;
  const messagesUsed = subscription.messages_used || 0;
  const messagesRemaining = Math.max(0, messageLimit - messagesUsed);
  const canSendMessage = isActive && messagesRemaining > 0;

  const trialDaysRemaining = trialEnd && isTrialing
    ? Math.min(7, Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))))
    : null;

  const features = isActive ? (PLAN_FEATURES[plan] || PLAN_FEATURES.trial) : getDisabledFeatures();

  console.log("[SubGuard]", {
    businessId: businessId.substring(0, 8),
    plan,
    status: subscription.status,
    isActive,
    isExpired,
    messagesUsed,
    messageLimit,
    canSendMessage,
    trialDaysRemaining,
  });

  return {
    isActive,
    isExpired,
    isTrialing,
    plan,
    status: subscription.status,
    messagesUsed,
    messageLimit,
    messagesRemaining,
    canSendMessage,
    trialDaysRemaining,
    expiresAt: subscription.current_period_end,
    features,
  };
}

/**
 * Quick check: can this business send a message?
 * Used in webhook hot path.
 */
export async function canSendMessage(businessId: string): Promise<boolean> {
  const supabase = createAdminClient();

  const { data } = await supabase
    .from("subscriptions")
    .select("message_limit, messages_used, status, current_period_end")
    .eq("business_id", businessId)
    .in("status", ["active", "trialing"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!data) {
    console.log("[SubGuard] canSendMessage: NO subscription for", businessId.substring(0, 8));
    return false;
  }

  const isExpired = data.current_period_end && new Date(data.current_period_end) < new Date();
  if (isExpired) {
    console.log("[SubGuard] canSendMessage: EXPIRED for", businessId.substring(0, 8));
    return false;
  }

  const allowed = data.messages_used < data.message_limit;
  if (!allowed) {
    console.log("[SubGuard] canSendMessage: LIMIT REACHED for", businessId.substring(0, 8), data.messages_used, "/", data.message_limit);
  }
  return allowed;
}

/**
 * Check if a business has access to a specific feature.
 * Returns { allowed, reason } for detailed error messages.
 */
export async function checkFeatureAccess(
  businessId: string,
  feature: keyof FeatureAccess
): Promise<{ allowed: boolean; reason?: string; upgradeTo?: string }> {
  const status = await getSubscriptionStatus(businessId);

  if (!status.isActive) {
    return {
      allowed: false,
      reason: status.isExpired ? "Your subscription has expired." : "No active subscription.",
      upgradeTo: "starter",
    };
  }

  if (!status.features[feature]) {
    // Determine which plan unlocks this feature
    let upgradeTo = "pro";
    if (PLAN_FEATURES.pro[feature]) upgradeTo = "pro";
    else if (PLAN_FEATURES.business[feature]) upgradeTo = "business";

    return {
      allowed: false,
      reason: `This feature requires the ${upgradeTo.charAt(0).toUpperCase() + upgradeTo.slice(1)} plan.`,
      upgradeTo,
    };
  }

  return { allowed: true };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getExpiredStatus(): SubscriptionStatus {
  return {
    isActive: false, isExpired: true, isTrialing: false,
    plan: "expired", status: "expired",
    messagesUsed: 0, messageLimit: 0, messagesRemaining: 0,
    canSendMessage: false, trialDaysRemaining: 0, expiresAt: null,
    features: getDisabledFeatures(),
  };
}

function getDisabledFeatures(): FeatureAccess {
  return {
    aiReply: false, leadCapture: false, conversationInbox: false,
    appointmentBooking: false, followUpSequences: false, analytics: false,
    customAiTraining: false, multiAgent: false, campaigns: false, prioritySupport: false,
  };
}
