"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, CreditCard, Zap, Loader2, AlertCircle, Info, CheckCircle, Clock } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";
import { isTestingMode } from "@/lib/payments/plans";

interface SubStatus {
  plan: string;
  status: string;
  isActive: boolean;
  isExpired: boolean;
  isTrialing: boolean;
  messagesUsed: number;
  messageLimit: number;
  trialDaysRemaining: number | null;
  expiresAt: string | null;
}

interface PlanData {
  id: string;
  name: string;
  tier: string;
  monthly: { price: number };
  yearly: { totalPrice: number; monthlyEquivalent: number };
  messageLimit: string;
  features: string[];
  popular?: boolean;
}

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const plans: PlanData[] = [
    { id: "starter", name: "Starter", tier: "starter", monthly: { price: isTestingMode() ? 10 : 799 }, yearly: { totalPrice: isTestingMode() ? 100 : 7670, monthlyEquivalent: isTestingMode() ? 8 : 639 }, messageLimit: "1,000/month", features: ["1,000 messages/month", "AI auto-reply", "Lead capture", "Conversation inbox", "Email support"] },
    { id: "pro", name: "Pro", tier: "pro", popular: true, monthly: { price: isTestingMode() ? 20 : 1999 }, yearly: { totalPrice: isTestingMode() ? 200 : 19190, monthlyEquivalent: isTestingMode() ? 17 : 1599 }, messageLimit: "5,000/month", features: ["5,000 messages/month", "Everything in Starter", "Appointment booking", "Follow-up sequences", "Priority support", "Analytics"] },
    { id: "business", name: "Business", tier: "business", monthly: { price: isTestingMode() ? 30 : 3999 }, yearly: { totalPrice: isTestingMode() ? 300 : 38390, monthlyEquivalent: isTestingMode() ? 25 : 3199 }, messageLimit: "20,000/month", features: ["20,000 messages/month", "Everything in Pro", "Custom AI training", "Multi-agent", "Campaigns", "Dedicated manager"] },
  ];

  useEffect(() => {
    fetch("/api/subscription/check").then((r) => r.json()).then((data) => {
      setSub(data);
      setPageLoading(false);
    }).catch(() => setPageLoading(false));

    // Check for payment success
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setSuccess("Payment successful! Your subscription is now active. 🎉");
      window.history.replaceState({}, "", "/billing");
    }
  }, []);

  async function handleSubscribe(planTier: string) {
    setError(null);
    setLoading(planTier);
    const planId = `${planTier}_${billingCycle}`;

    try {
      const res = await fetch("/api/payments/razorpay/create-subscription", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan_id: planId }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(null); return; }

      const options = {
        key: data.key_id, amount: data.amount, currency: data.currency, order_id: data.order_id,
        name: "BizBot AI", description: `${data.plan.name} Plan (${data.plan.billing_cycle})`,
        prefill: data.prefill,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          const verifyRes = await fetch("/api/payments/razorpay/verify", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...response, plan_id: planId }),
          });
          if (verifyRes.ok) { window.location.assign("/billing?success=true"); }
          else { const d = await verifyRes.json(); setError(d.error || "Verification failed"); setLoading(null); }
        },
        theme: { color: "#6366f1" },
        modal: { ondismiss: () => setLoading(null) },
      };

      if (!(window as unknown as Record<string, unknown>).Razorpay) {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => { const rzp = new (window as unknown as Record<string, new (o: unknown) => { open: () => void }>).Razorpay(options); rzp.open(); };
        document.body.appendChild(script);
      } else {
        const rzp = new (window as unknown as Record<string, new (o: unknown) => { open: () => void }>).Razorpay(options);
        rzp.open();
      }
    } catch { setError("Something went wrong."); setLoading(null); }
  }

  if (pageLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  const currentTier = sub?.plan || "trial";
  const isCurrentPlan = (tier: string) => currentTier === tier && sub?.isActive;

  return (
    <div>
      <PageHeader title="Billing" description="Manage your subscription" />

      {/* Success Banner */}
      {success && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <p className="text-sm font-medium text-emerald-800">{success}</p>
        </motion.div>
      )}

      {/* Expired Banner */}
      {sub?.isExpired && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <div><p className="text-sm font-semibold text-red-800">Subscription Expired</p><p className="text-xs text-red-600">Renew now to restore access to all features.</p></div>
        </div>
      )}

      {/* Current Subscription Card */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${sub?.isActive ? "bg-emerald-50" : "bg-gray-100"}`}>
              {sub?.isActive ? <CheckCircle className="w-6 h-6 text-emerald-600" /> : <CreditCard className="w-6 h-6 text-gray-400" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold capitalize">{currentTier} Plan</h3>
                <Badge variant={sub?.isActive ? "success" : sub?.isExpired ? "danger" : "warning"}>
                  {sub?.isActive ? "Active" : sub?.isExpired ? "Expired" : "Inactive"}
                </Badge>
                {sub?.isTrialing && <Badge variant="info">Trial</Badge>}
              </div>
              <p className="text-sm text-text-secondary mt-0.5">
                {sub?.isTrialing && sub.trialDaysRemaining !== null && `Trial ends in ${sub.trialDaysRemaining} days • `}
                {sub?.expiresAt && !sub.isTrialing && `Renews ${new Date(sub.expiresAt).toLocaleDateString("en-IN")} • `}
                Messages: {sub?.messagesUsed || 0} / {sub?.messageLimit || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">Message Usage</span>
            <span className="text-sm font-semibold">{sub?.messagesUsed || 0} / {sub?.messageLimit || 0}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className={`h-full rounded-full ${(sub?.messagesUsed || 0) > (sub?.messageLimit || 1) * 0.8 ? "bg-red-500" : "bg-primary"}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, ((sub?.messagesUsed || 0) / (sub?.messageLimit || 1)) * 100)}%` }} transition={{ duration: 0.8 }} />
          </div>
          {sub?.isTrialing && sub.trialDaysRemaining !== null && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-text-secondary">Trial Days</span>
              <span className="text-sm font-semibold">{7 - (sub.trialDaysRemaining || 0)} / 7 used</span>
            </div>
          )}
        </div>
      </Card>

      {/* Error */}
      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{error}</p></div>}

      {/* Testing Mode Banner */}
      {isTestingMode() && (
        <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-600" />
          <span className="text-xs text-blue-700 font-medium">Testing Mode — Prices reduced for testing (₹10/₹20/₹30)</span>
        </div>
      )}

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button onClick={() => setBillingCycle("monthly")} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${billingCycle === "monthly" ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>Monthly</button>
        <button onClick={() => setBillingCycle("yearly")} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${billingCycle === "yearly" ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>
          Yearly <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${billingCycle === "yearly" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"}`}>Save 20%</span>
        </button>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.tier);
          const isMonthly = billingCycle === "monthly";
          return (
            <Card key={plan.id} className={`relative flex flex-col ${plan.popular ? "border-primary ring-2 ring-primary/20" : ""} ${isCurrent ? "ring-2 ring-emerald-300 border-emerald-300" : ""}`}>
              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute -top-3 left-4"><span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Current Plan</span></div>
              )}
              {/* Popular Badge */}
              {plan.popular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">Popular</span></div>
              )}

              <div className="text-center mb-5 pt-2">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-text-muted mt-1">{plan.messageLimit}</p>
                <div className="mt-3">
                  <span className="text-3xl font-bold">₹{isMonthly ? plan.monthly.price : plan.yearly.monthlyEquivalent}</span>
                  <span className="text-text-muted text-sm">/mo</span>
                </div>
                {!isMonthly && (
                  <div className="mt-1">
                    <p className="text-xs text-text-muted">Billed ₹{plan.yearly.totalPrice.toLocaleString()}/year</p>
                    <p className="text-xs text-emerald-600 font-medium">Save ₹{((plan.monthly.price * 12) - plan.yearly.totalPrice).toLocaleString()}/year</p>
                  </div>
                )}
              </div>

              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2"><Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" /><span className="text-sm text-text-secondary">{f}</span></li>
                ))}
              </ul>

              {isCurrent ? (
                <Button variant="secondary" className="w-full" disabled>
                  <CheckCircle className="w-4 h-4" /> Current Plan
                </Button>
              ) : (
                <Button variant={plan.popular ? "primary" : "secondary"} className="w-full" onClick={() => handleSubscribe(plan.tier)} disabled={loading === plan.tier}>
                  {loading === plan.tier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                  {loading === plan.tier ? "Processing..." : "Upgrade"}
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <p className="text-xs text-text-muted">Secure payments via Razorpay • UPI, Cards, Net Banking • Cancel anytime</p>
      </div>
    </div>
  );
}
