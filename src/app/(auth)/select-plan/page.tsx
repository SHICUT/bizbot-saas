"use client";

import { useState, useEffect } from "react";
import { Check, Zap, Loader2 } from "lucide-react";
import Button from "@/components/ui/Button";

const plans = [
  {
    id: "trial",
    name: "Free Trial",
    price: "₹0",
    period: "7 days",
    description: "Try free for 7 days",
    features: ["100 messages", "AI auto-reply", "Lead capture", "Basic dashboard"],
    cta: "Start Free Trial",
    highlight: false,
  },
  {
    id: "starter",
    name: "Starter",
    price: "₹799",
    period: "/month",
    description: "For small businesses getting started",
    features: ["1,000 messages/month", "AI auto-reply", "Lead capture", "Conversation inbox", "Email support"],
    cta: "Choose Starter",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹1,999",
    period: "/month",
    description: "For growing businesses",
    features: ["5,000 messages/month", "Everything in Starter", "Appointment booking", "Follow-up sequences", "Priority support", "Analytics"],
    cta: "Choose Pro",
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: "₹3,999",
    period: "/month",
    description: "For high-volume businesses",
    features: ["20,000 messages/month", "Everything in Pro", "Custom AI training", "Multi-agent support", "Dedicated manager"],
    cta: "Choose Business",
    highlight: false,
  },
];

export default function SelectPlanPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check if user already has an active plan
  useEffect(() => {
    fetch("/api/payments/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.isActive) {
          // Already has active plan — skip to dashboard
          window.location.assign("/");
        }
      })
      .catch(() => {});
  }, []);

  async function handleSelectPlan(planId: string) {
    setLoading(planId);
    setError(null);

    try {
      const res = await fetch("/api/payments/activate-trial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planId }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          // Session not ready — redirect to login
          setError("Session expired. Redirecting to login...");
          setTimeout(() => { window.location.assign("/login"); }, 2000);
        } else {
          setError(data.error || "Failed to activate plan. Please try again.");
        }
        setLoading(null);
        return;
      }

      // Success — redirect to dashboard
      window.location.assign("/");
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-text-primary">BizBot AI</span>
          </div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">Choose your plan</h1>
          <p className="text-text-secondary">Start with a free trial. Upgrade anytime.</p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 text-center max-w-md mx-auto">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white rounded-xl border p-6 flex flex-col ${
                plan.highlight ? "border-primary ring-2 ring-primary/20" : "border-border"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">Popular</span>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                <p className="text-xs text-text-muted mt-1">{plan.description}</p>
              </div>

              <div className="mb-5">
                <span className="text-2xl font-bold text-text-primary">{plan.price}</span>
                <span className="text-text-muted text-sm">{plan.period}</span>
              </div>

              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-text-secondary">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              <Button
                variant={plan.highlight ? "primary" : "secondary"}
                className="w-full"
                onClick={() => handleSelectPlan(plan.id)}
                disabled={loading === plan.id}
              >
                {loading === plan.id ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading === plan.id ? "Activating..." : plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
