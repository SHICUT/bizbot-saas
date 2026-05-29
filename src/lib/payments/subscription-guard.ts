import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Subscription Guard
 *
 * Middleware-like functions to check subscription status
 * before allowing actions (sending messages, using features).
 *
 * Used by:
 * - WhatsApp message handler (check message limit)
 * - API routes (check feature access)
 * - Dashboard (show upgrade prompts)
 */

export interface SubscriptionStatus {
  isActive: boolean;
  plan: string;
  tier: "trial" | "starter" | "pro" | "business";
  messagesUsed: number;
  messageLimit: number;
  messagesRemaining: number;
  usagePercentage: number;
  isTrialing: boolean;
  trialDaysRemaining: number | null;
  expiresAt: string | null;
  canSendMessage: boolean;
  features: FeatureAccess;
}

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
}

/**
 * Get the full subscription status for a business.
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
    return getExpiredStatus();
  }

  const now = new Date();
  const isTrialing = subscription.status === "trialing";
  const trialEnd = subscription.trial_end ? new Date(subscription.trial_end) : null;
  const trialDaysRemaining = trialEnd
    ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)))
    : null;

  const messagesRemaining = Math.max(0, subscription.message_limit - subscription.messages_used);
  const usagePercentage = Math.round((subscription.messages_used / subscription.message_limit) * 100);

  const tier = subscription.plan as "trial" | "starter" | "pro" | "business";
  const features = getFeatureAccess(tier);

  // Check if subscription is actually valid
  const periodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end)
    : null;
  const isExpired = periodEnd ? periodEnd < now : false;
  const isActive = !isExpired && ["active", "trialing"].includes(subscription.status);

  return {
    isActive,
    plan: subscription.plan,
    tier,
    messagesUsed: subscription.messages_used,
    messageLimit: subscription.message_limit,
    messagesRemaining,
    usagePercentage,
    isTrialing,
    trialDaysRemaining,
    expiresAt: subscription.current_period_end,
    canSendMessage: isActive && messagesRemaining > 0,
    features,
  };
}

/**
 * Quick check: can this business send a message?
 * Used in the hot path (webhook processing).
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

  if (!data) return false;

  // Check period hasn't expired
  if (data.current_period_end && new Date(data.current_period_end) < new Date()) {
    return false;
  }

  return data.messages_used < data.message_limit;
}

/**
 * Check if a business has access to a specific feature.
 */
export async function hasFeatureAccess(
  businessId: string,
  feature: keyof FeatureAccess
): Promise<boolean> {
  const status = await getSubscriptionStatus(businessId);
  return status.isActive && status.features[feature];
}

// ─── Feature Access by Tier ─────────────────────────────────────────────────

function getFeatureAccess(tier: string): FeatureAccess {
  switch (tier) {
    case "business":
      return {
        aiReply: true,
        leadCapture: true,
        conversationInbox: true,
        appointmentBooking: true,
        followUpSequences: true,
        analytics: true,
        customAiTraining: true,
        multiAgent: true,
        campaigns: true,
      };
    case "pro":
      return {
        aiReply: true,
        leadCapture: true,
        conversationInbox: true,
        appointmentBooking: true,
        followUpSequences: true,
        analytics: true,
        customAiTraining: false,
        multiAgent: false,
        campaigns: false,
      };
    case "starter":
      return {
        aiReply: true,
        leadCapture: true,
        conversationInbox: true,
        appointmentBooking: false,
        followUpSequences: false,
        analytics: false,
        customAiTraining: false,
        multiAgent: false,
        campaigns: false,
      };
    default: // trial
      return {
        aiReply: true,
        leadCapture: true,
        conversationInbox: true,
        appointmentBooking: false,
        followUpSequences: false,
        analytics: false,
        customAiTraining: false,
        multiAgent: false,
        campaigns: false,
      };
  }
}

function getExpiredStatus(): SubscriptionStatus {
  return {
    isActive: false,
    plan: "expired",
    tier: "trial",
    messagesUsed: 0,
    messageLimit: 0,
    messagesRemaining: 0,
    usagePercentage: 100,
    isTrialing: false,
    trialDaysRemaining: 0,
    expiresAt: null,
    canSendMessage: false,
    features: getFeatureAccess("expired"),
  };
}
