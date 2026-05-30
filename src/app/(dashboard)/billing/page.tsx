"use client";

import { useState } from "react";
import { Check, CreditCard, Zap, Loader2, AlertCircle, Info } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

// ─── Pricing Data ───────────────────────────────────────────────────────────

interface PlanData {
  id: string;
  name: string;
  tier: "starter" | "pro" | "business";
  monthly: {
    price: number; // ₹/month
    label: string;
  };
  yearly: {
    totalPrice: number; // ₹/year
    monthlyEquivalent: number; // ₹/month equivalent
    label: string;
  };
  messageLimit: string;
  features: string[];
  popular?: boolean;
  tooltip?: string;
}

const plans: PlanData[] = [
  {
    id: "starter",
    name: "Starter",
    tier: "starter",
    monthly: { price: 799, label: "₹799/month" },
    yearly: { totalPrice: 7670, monthlyEquivalent: 639, label: "₹7,670/year" },
    messageLimit: "1,000 messages/month",
    features: [
      "1,000 messages/month",
      "AI auto-reply",
      "Lead capture",
      "Conversation inbox",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tier: "pro",
    monthly: { price: 1999, label: "₹1,999/month" },
    yearly: { totalPrice: 19190, monthlyEquivalent: 1599, label: "₹19,190/year" },
    messageLimit: "5,000 messages/month",
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
    id: "business",
    name: "Business",
    tier: "business",
    monthly: { price: 3999, label: "₹3,999/month" },
    yearly: { totalPrice: 38390, monthlyEquivalent: 3199, label: "₹38,390/year" },
    messageLimit: "20,000 messages/month",
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
];

// ─── Component ──────────────────────────────────────────────────────────────

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubscribe(planTier: string) {
    setError(null);
    setLoading(planTier);

    const planId = `${planTier}_${billingCycle}`;

    try {
      const response = await fetch("/api/payments/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to create payment. Please try again.");
        setLoading(null);
        return;
      }

      // Open Razorpay checkout (Order-based flow)
      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        order_id: data.order_id,
        name: "BizBot AI",
        description: `${data.plan.name} Plan (${data.plan.billing_cycle})`,
        prefill: data.prefill,
        handler: async function (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) {
          // Verify payment on server
          const verifyRes = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...response, plan_id: planId }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok) {
            // Success — reload to show updated plan
            window.location.reload();
          } else {
            setError(verifyData.error || "Payment verification failed. Contact support.");
            setLoading(null);
          }
        },
        theme: { color: "#6366f1" },
        modal: {
          ondismiss: function () {
            setLoading(null);
          },
        },
      };

      if (!(window as unknown as Record<string, unknown>).Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => {
          const rzp = new (window as unknown as Record<string, new (opts: unknown) => { open: () => void }>).Razorpay(options);
          rzp.open();
        };
        document.body.appendChild(script);
      } else {
        const rzp = new (window as unknown as Record<string, new (opts: unknown) => { open: () => void }>).Razorpay(options);
        rzp.open();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Billing"
        description="Manage your subscription and payments"
      />

      {/* Current Plan */}
      <Card className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-text-primary">
                  Trial Plan
                </h3>
                <Badge variant="warning">Trial</Badge>
              </div>
              <p className="text-sm text-text-secondary">
                14-day free trial • 100 messages included
              </p>
            </div>
          </div>
          <Button variant="secondary">Manage</Button>
        </div>

        {/* Usage */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Messages used</span>
            <span className="text-sm font-semibold text-text-primary">
              12 / 100
            </span>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: "12%" }}
            />
          </div>
          <p className="text-xs text-text-muted mt-2">
            88 messages remaining • Upgrade for more
          </p>
        </div>
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex items-center justify-center gap-2 mb-8">
        <button
          onClick={() => setBillingCycle("monthly")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            billingCycle === "monthly"
              ? "bg-primary text-white shadow-sm"
              : "bg-gray-100 text-text-secondary hover:bg-gray-200"
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => setBillingCycle("yearly")}
          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
            billingCycle === "yearly"
              ? "bg-primary text-white shadow-sm"
              : "bg-gray-100 text-text-secondary hover:bg-gray-200"
          }`}
        >
          Yearly
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
              billingCycle === "yearly"
                ? "bg-white/20 text-white"
                : "bg-emerald-100 text-emerald-700"
            }`}
          >
            Save 20%
          </span>
        </button>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            billingCycle={billingCycle}
            loading={loading === plan.tier}
            onSubscribe={() => handleSubscribe(plan.tier)}
          />
        ))}
      </div>

      {/* Footer Info */}
      <div className="mt-8 text-center space-y-2">
        <p className="text-xs text-text-muted">
          Secure payments powered by Razorpay • UPI, Cards, Net Banking, Wallets
        </p>
        <p className="text-xs text-text-muted">
          All plans include 14-day money-back guarantee • Cancel anytime
        </p>
      </div>
    </div>
  );
}

// ─── Plan Card Component ────────────────────────────────────────────────────

function PlanCard({
  plan,
  billingCycle,
  loading,
  onSubscribe,
}: {
  plan: PlanData;
  billingCycle: "monthly" | "yearly";
  loading: boolean;
  onSubscribe: () => void;
}) {
  const isMonthly = billingCycle === "monthly";

  return (
    <Card
      className={`relative flex flex-col ${
        plan.popular ? "border-primary ring-1 ring-primary/20" : ""
      }`}
    >
      {/* Popular Badge */}
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      {/* Plan Header */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2">
          <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
          {plan.tooltip && (
            <div className="relative group">
              <Info className="w-4 h-4 text-text-muted cursor-help" />
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none w-48 text-center">
                {plan.tooltip}
              </div>
            </div>
          )}
        </div>

        <p className="text-sm text-text-muted mt-1">{plan.messageLimit}</p>

        {/* Price Display */}
        <div className="mt-4">
          {isMonthly ? (
            <>
              <span className="text-3xl font-bold text-text-primary">
                ₹{plan.monthly.price.toLocaleString("en-IN")}
              </span>
              <span className="text-text-muted text-sm">/month</span>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold text-text-primary">
                ₹{plan.yearly.monthlyEquivalent.toLocaleString("en-IN")}
              </span>
              <span className="text-text-muted text-sm">/month</span>
              <div className="mt-1.5 space-y-0.5">
                <p className="text-xs text-text-muted">
                  Billed as ₹{plan.yearly.totalPrice.toLocaleString("en-IN")}/year
                </p>
                <p className="text-xs font-medium text-emerald-600">
                  Save ₹{((plan.monthly.price * 12) - plan.yearly.totalPrice).toLocaleString("en-IN")}/year
                </p>
              </div>
            </>
          )}
        </div>

        {/* Crossed out original price for yearly */}
        {!isMonthly && (
          <p className="text-sm text-text-muted mt-1">
            <span className="line-through">
              ₹{plan.monthly.price.toLocaleString("en-IN")}/mo
            </span>
          </p>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-6 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-text-secondary">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <Button
        variant={plan.popular ? "primary" : "secondary"}
        className="w-full"
        onClick={onSubscribe}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Zap className="w-4 h-4" />
        )}
        {loading ? "Processing..." : "Upgrade"}
      </Button>
    </Card>
  );
}
