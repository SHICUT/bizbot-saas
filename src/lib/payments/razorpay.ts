import Razorpay from "razorpay";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPlanById } from "./plans";

/**
 * Razorpay Payment Integration
 *
 * Handles:
 * - Creating subscriptions
 * - Verifying payments
 * - Managing subscription lifecycle
 * - Generating invoices
 */

// ─── Client Initialization ──────────────────────────────────────────────────

function getRazorpayClient(): Razorpay {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured");
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

// ─── Create Subscription ────────────────────────────────────────────────────

interface CreateSubscriptionInput {
  businessId: string;
  planId: string;
  customerEmail: string;
  customerPhone?: string;
  customerName?: string;
}

interface CreateSubscriptionResult {
  subscriptionId: string;
  shortUrl: string; // Razorpay hosted payment page
  razorpayPlanId: string;
}

export async function createRazorpaySubscription(
  input: CreateSubscriptionInput
): Promise<CreateSubscriptionResult> {
  const razorpay = getRazorpayClient();
  const supabase = createAdminClient();
  const plan = getPlanById(input.planId);

  if (!plan) {
    throw new Error(`Invalid plan: ${input.planId}`);
  }

  // 1. Get or create Razorpay plan
  const razorpayPlanId = await getOrCreateRazorpayPlan(razorpay, plan);

  // 2. Create Razorpay subscription
  const subscription = await razorpay.subscriptions.create({
    plan_id: razorpayPlanId,
    total_count: plan.billingCycle === "monthly" ? 12 : 1, // 12 months or 1 year
    quantity: 1,
    customer_notify: 1,
    notes: {
      business_id: input.businessId,
      plan_id: input.planId,
      plan_tier: plan.tier,
    },
  });

  // 3. Store subscription in our database
  await supabase.from("subscriptions").upsert(
    {
      business_id: input.businessId,
      plan: plan.tier,
      status: "created", // will become "active" after payment
      billing_cycle: plan.billingCycle,
      amount: plan.priceInCents,
      currency: "INR",
      provider: "razorpay",
      razorpay_subscription_id: subscription.id,
      razorpay_plan_id: razorpayPlanId,
      message_limit: plan.messageLimit,
      messages_used: 0,
    },
    { onConflict: "business_id" }
  );

  // 4. Update business plan
  await supabase
    .from("businesses")
    .update({ plan: plan.tier })
    .eq("id", input.businessId);

  return {
    subscriptionId: subscription.id,
    shortUrl: subscription.short_url || "",
    razorpayPlanId,
  };
}

// ─── Verify Payment ─────────────────────────────────────────────────────────

interface VerifyPaymentInput {
  razorpayPaymentId: string;
  razorpaySubscriptionId: string;
  razorpaySignature: string;
}

export function verifyRazorpayPayment(input: VerifyPaymentInput): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("RAZORPAY_KEY_SECRET not configured");

  const body = `${input.razorpayPaymentId}|${input.razorpaySubscriptionId}`;
  const expectedSignature = createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === input.razorpaySignature;
}

// ─── Cancel Subscription ────────────────────────────────────────────────────

export async function cancelRazorpaySubscription(
  businessId: string,
  cancelAtPeriodEnd: boolean = true
): Promise<void> {
  const razorpay = getRazorpayClient();
  const supabase = createAdminClient();

  // Get current subscription
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("razorpay_subscription_id")
    .eq("business_id", businessId)
    .eq("provider", "razorpay")
    .in("status", ["active", "created"])
    .single();

  if (!subscription?.razorpay_subscription_id) {
    throw new Error("No active Razorpay subscription found");
  }

  // Cancel in Razorpay
  await razorpay.subscriptions.cancel(
    subscription.razorpay_subscription_id,
    cancelAtPeriodEnd
  );

  // Update our database
  await supabase
    .from("subscriptions")
    .update({
      status: cancelAtPeriodEnd ? "active" : "cancelled",
      cancel_at_period_end: cancelAtPeriodEnd,
      cancelled_at: cancelAtPeriodEnd ? null : new Date().toISOString(),
    })
    .eq("business_id", businessId)
    .eq("razorpay_subscription_id", subscription.razorpay_subscription_id);
}

// ─── Webhook Signature Validation ───────────────────────────────────────────

export function validateRazorpayWebhook(
  body: string,
  signature: string | null
): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expectedSignature = createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return expectedSignature === signature;
}

// ─── Helper: Get or Create Razorpay Plan ────────────────────────────────────

async function getOrCreateRazorpayPlan(
  razorpay: Razorpay,
  plan: ReturnType<typeof getPlanById> & object
): Promise<string> {
  const supabase = createAdminClient();

  // Check if we already have a Razorpay plan ID stored
  const { data: dbPlan } = await supabase
    .from("plans")
    .select("razorpay_plan_id")
    .eq("id", plan.id)
    .single();

  if (dbPlan?.razorpay_plan_id) {
    return dbPlan.razorpay_plan_id;
  }

  // Create plan in Razorpay
  const period = plan.billingCycle === "monthly" ? "monthly" : "yearly";
  const razorpayPlan = await razorpay.plans.create({
    period,
    interval: 1,
    item: {
      name: `BizBot ${plan.name} (${plan.billingCycle})`,
      amount: plan.priceInCents,
      currency: "INR",
      description: `${plan.messageLimit.toLocaleString()} messages/month`,
    },
  });

  // Store the plan ID
  await supabase
    .from("plans")
    .update({ razorpay_plan_id: razorpayPlan.id })
    .eq("id", plan.id);

  return razorpayPlan.id;
}

// ─── Process Webhook Events ─────────────────────────────────────────────────

export async function processRazorpayWebhook(event: RazorpayWebhookEvent): Promise<void> {
  const supabase = createAdminClient();

  switch (event.event) {
    case "subscription.activated":
    case "subscription.charged": {
      const subData = event.payload.subscription.entity;
      const paymentData = event.payload.payment?.entity;

      // Activate subscription
      await supabase
        .from("subscriptions")
        .update({
          status: "active",
          current_period_start: new Date(subData.current_start * 1000).toISOString(),
          current_period_end: new Date(subData.current_end * 1000).toISOString(),
          messages_used: 0, // Reset on new billing cycle
        })
        .eq("razorpay_subscription_id", subData.id);

      // Record payment
      if (paymentData) {
        await supabase.from("payments").insert({
          business_id: subData.notes?.business_id || null,
          amount: paymentData.amount,
          currency: paymentData.currency?.toUpperCase() || "INR",
          status: "captured",
          provider: "razorpay",
          razorpay_payment_id: paymentData.id,
          razorpay_order_id: paymentData.order_id,
          payment_method: paymentData.method,
          paid_at: new Date().toISOString(),
          description: `${subData.notes?.plan_tier || "subscription"} plan payment`,
        });

        // Generate invoice
        await generateInvoice(supabase, subData, paymentData);
      }
      break;
    }

    case "subscription.pending": {
      const subData = event.payload.subscription.entity;
      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("razorpay_subscription_id", subData.id);
      break;
    }

    case "subscription.halted":
    case "subscription.cancelled": {
      const subData = event.payload.subscription.entity;
      await supabase
        .from("subscriptions")
        .update({
          status: "cancelled",
          cancelled_at: new Date().toISOString(),
        })
        .eq("razorpay_subscription_id", subData.id);

      // Downgrade business to free/trial
      if (subData.notes?.business_id) {
        await supabase
          .from("businesses")
          .update({ plan: "trial" })
          .eq("id", subData.notes.business_id);
      }
      break;
    }

    case "payment.failed": {
      const paymentData = event.payload.payment?.entity;
      if (!paymentData) break;
      await supabase.from("payments").insert({
        business_id: paymentData.notes?.business_id || null,
        amount: paymentData.amount,
        currency: paymentData.currency?.toUpperCase() || "INR",
        status: "failed",
        provider: "razorpay",
        razorpay_payment_id: paymentData.id,
        failure_reason: paymentData.error_description || "Payment failed",
        description: "Subscription payment failed",
      });
      break;
    }
  }
}

// ─── Invoice Generation ─────────────────────────────────────────────────────

async function generateInvoice(
  supabase: ReturnType<typeof createAdminClient>,
  subscription: { id: string; notes?: Record<string, string>; plan_id?: string },
  payment: { id: string; amount: number; currency?: string }
): Promise<void> {
  const businessId = subscription.notes?.business_id;
  if (!businessId) return;

  // Get subscription record
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("id, plan, billing_cycle")
    .eq("razorpay_subscription_id", subscription.id)
    .single();

  if (!sub) return;

  // Generate invoice number
  const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

  const subtotal = payment.amount;
  const tax = Math.round(subtotal * 0.18); // 18% GST
  const total = subtotal + tax;

  await supabase.from("invoices").insert({
    business_id: businessId,
    subscription_id: sub.id,
    invoice_number: invoiceNumber,
    provider: "razorpay",
    provider_invoice_id: payment.id,
    subtotal,
    tax,
    total,
    currency: payment.currency?.toUpperCase() || "INR",
    status: "paid",
    period_start: new Date().toISOString(),
    period_end: new Date(
      Date.now() + (sub.billing_cycle === "yearly" ? 365 : 30) * 24 * 60 * 60 * 1000
    ).toISOString(),
    line_items: [
      {
        description: `BizBot ${sub.plan} Plan (${sub.billing_cycle})`,
        amount: subtotal,
        quantity: 1,
      },
      {
        description: "GST (18%)",
        amount: tax,
        quantity: 1,
      },
    ],
    paid_at: new Date().toISOString(),
  });
}

// ─── Razorpay Webhook Event Types ───────────────────────────────────────────

interface RazorpayWebhookEvent {
  event: string;
  payload: {
    subscription: {
      entity: {
        id: string;
        plan_id: string;
        status: string;
        current_start: number;
        current_end: number;
        notes?: Record<string, string>;
      };
    };
    payment?: {
      entity: {
        id: string;
        amount: number;
        currency?: string;
        method: string;
        order_id?: string;
        error_description?: string;
        notes?: Record<string, string>;
      };
    };
  };
}
