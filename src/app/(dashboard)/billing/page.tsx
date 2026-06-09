"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, CreditCard, Zap, Loader2, AlertCircle, CheckCircle, Tag, X } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import PageHeader from "@/components/layout/PageHeader";

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
  yearly: { totalPrice: number; monthlyEquivalent: number; savings: number };
  messageLimit: string;
  features: string[];
  popular?: boolean;
}

interface CouponData {
  code: string;
  description: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
}

export default function BillingPage() {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponData | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [selectedPlanForCoupon, setSelectedPlanForCoupon] = useState<string | null>(null);

  const plans: PlanData[] = [
    { id: "starter", name: "Starter", tier: "starter", monthly: { price: 19 }, yearly: { totalPrice: 182, monthlyEquivalent: 15.17, savings: 46 }, messageLimit: "1K AI Replies/month", features: ["AI Auto Reply", "Knowledge Base", "Conversations Inbox", "Leads CRM", "Media Library", "Basic Analytics", "AI Readiness"] },
    { id: "growth", name: "Growth", tier: "growth", popular: true, monthly: { price: 49 }, yearly: { totalPrice: 470, monthlyEquivalent: 39.17, savings: 118 }, messageLimit: "5K AI Replies/month", features: ["Everything in Starter", "Broadcast Campaigns", "AI Follow-Up Automation", "Appointments", "Revenue Dashboard", "Lead Scoring", "Advanced CRM", "CSV Export"] },
    { id: "business", name: "Business", tier: "business", monthly: { price: 99 }, yearly: { totalPrice: 950, monthlyEquivalent: 79.17, savings: 238 }, messageLimit: "20K AI Replies/month", features: ["Everything in Growth", "AI Sales Employee", "Multi-Agent Access", "Advanced Analytics", "Revenue Attribution", "Campaign Analytics", "WhatsApp Compliance Tools"] },
  ];

  useEffect(() => {
    fetch("/api/subscription/check").then((r) => r.json()).then((data) => {
      setSub(data);
      setPageLoading(false);
    }).catch(() => setPageLoading(false));

    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setSuccess("Payment successful! Your subscription is now active. 🎉");
      window.history.replaceState({}, "", "/billing");
    }
  }, []);

  async function handleApplyCoupon(planTier: string) {
    if (!couponCode.trim()) return;
    setCouponError(null);
    setCouponLoading(true);
    setSelectedPlanForCoupon(planTier);

    const planId = `${planTier}_${billingCycle}`;

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode.trim(), plan_id: planId }),
      });
      const data = await res.json();

      if (data.valid) {
        setAppliedCoupon({
          code: data.coupon.code,
          description: data.coupon.description,
          discount_type: data.coupon.discount_type,
          discount_value: data.coupon.discount_value,
          originalAmount: data.originalAmount,
          discountAmount: data.discountAmount,
          finalAmount: data.finalAmount,
        });
        setCouponError(null);
      } else {
        setCouponError(data.error || "Invalid coupon.");
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError("Failed to validate coupon.");
      setAppliedCoupon(null);
    }
    setCouponLoading(false);
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError(null);
    setSelectedPlanForCoupon(null);
  }

  async function handleSubscribe(planTier: string) {
    setError(null);
    setLoading(planTier);
    const planId = `${planTier}_${billingCycle}`;

    try {
      const res = await fetch("/api/payments/razorpay/create-subscription", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          coupon_code: (appliedCoupon && selectedPlanForCoupon === planTier) ? appliedCoupon.code : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(null); return; }

      const options = {
        key: data.key_id, amount: data.amount, currency: data.currency, order_id: data.order_id,
        name: "FlowNex AI", description: `${data.plan.name} Plan (${data.plan.billing_cycle})`,
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
                {sub?.isTrialing && sub.trialDaysRemaining !== null && `${sub.trialDaysRemaining} of 7 trial days remaining • `}
                {sub?.expiresAt && !sub.isTrialing && `Renews ${new Date(sub.expiresAt).toLocaleDateString("en-US")} • `}
                AI Replies: {sub?.messagesUsed || 0} / {sub?.messageLimit || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Usage Bar */}
        <div className="mt-5 pt-5 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-text-secondary">AI Reply Usage</span>
            <span className="text-sm font-semibold">{sub?.messagesUsed || 0} / {sub?.messageLimit || 0}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <motion.div className={`h-full rounded-full ${(sub?.messagesUsed || 0) > (sub?.messageLimit || 1) * 0.8 ? "bg-red-500" : "bg-primary"}`} initial={{ width: 0 }} animate={{ width: `${Math.min(100, ((sub?.messagesUsed || 0) / (sub?.messageLimit || 1)) * 100)}%` }} transition={{ duration: 0.8 }} />
          </div>
          {sub?.isTrialing && sub.trialDaysRemaining !== null && (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-text-secondary">Trial Days</span>
              <span className="text-sm font-semibold">{sub.trialDaysRemaining} of 7 remaining</span>
            </div>
          )}
        </div>
      </Card>

      {/* Error */}
      {error && <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3"><AlertCircle className="w-5 h-5 text-red-600" /><p className="text-sm text-red-700">{error}</p></div>}

      {/* Yearly Savings Banner */}
      <div className="mb-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2">
        <span className="text-xs text-emerald-700 font-medium">💰 Save 20% with yearly billing</span>
      </div>

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <button onClick={() => { setBillingCycle("monthly"); removeCoupon(); }} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${billingCycle === "monthly" ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>Monthly</button>
        <button onClick={() => { setBillingCycle("yearly"); removeCoupon(); }} className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${billingCycle === "yearly" ? "bg-primary text-white shadow-sm" : "bg-gray-100 text-text-secondary hover:bg-gray-200"}`}>
          Yearly <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${billingCycle === "yearly" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-700"}`}>Save 20%</span>
        </button>
      </div>

      {/* Coupon Section */}
      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Tag className="w-4 h-4 text-primary" />
          <h4 className="text-sm font-semibold">Have a coupon code?</h4>
        </div>
        {appliedCoupon ? (
          <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-200">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-800">Coupon Applied: {appliedCoupon.code}</span>
              </div>
              <p className="text-xs text-emerald-600 mt-0.5">
                {appliedCoupon.discount_type === "percentage" ? `${appliedCoupon.discount_value}% Off` : `$${appliedCoupon.discount_value} Off`}
                {" "}— You save ${appliedCoupon.discountAmount.toFixed(2)}
              </p>
            </div>
            <button onClick={removeCoupon} className="p-1.5 rounded-lg hover:bg-emerald-100 text-emerald-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              value={couponCode}
              onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponError(null); }}
              placeholder="Enter coupon code"
              className="flex-1 px-4 py-2.5 text-sm rounded-lg border border-border focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all uppercase"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                // Apply to the first non-current plan (user will select at checkout)
                const targetPlan = plans.find(p => !isCurrentPlan(p.tier)) || plans[0];
                handleApplyCoupon(targetPlan.tier);
              }}
              disabled={!couponCode.trim() || couponLoading}
            >
              {couponLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Apply"}
            </Button>
          </div>
        )}
        {couponError && <p className="text-xs text-red-600 mt-2">{couponError}</p>}
      </Card>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => {
          const isCurrent = isCurrentPlan(plan.tier);
          const isMonthly = billingCycle === "monthly";
          const basePrice = isMonthly ? plan.monthly.price : plan.yearly.totalPrice;
          const hasCoupon = appliedCoupon && selectedPlanForCoupon === plan.tier;
          const displayPrice = hasCoupon ? appliedCoupon.finalAmount : basePrice;

          return (
            <Card key={plan.id} className={`relative flex flex-col ${plan.popular ? "border-primary ring-2 ring-primary/20" : ""} ${isCurrent ? "ring-2 ring-emerald-300 border-emerald-300" : ""}`}>
              {/* Current Plan Badge */}
              {isCurrent && (
                <div className="absolute -top-3 left-4"><span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold shadow-sm flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Current Plan</span></div>
              )}
              {/* Popular Badge */}
              {plan.popular && !isCurrent && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="px-3 py-1 rounded-full bg-primary text-white text-xs font-semibold">Most Popular</span></div>
              )}

              <div className="text-center mb-5 pt-2">
                <h3 className="text-lg font-bold">{plan.name}</h3>
                <p className="text-xs text-text-muted mt-1">{plan.messageLimit}</p>
                <div className="mt-3">
                  {hasCoupon ? (
                    <>
                      <span className="text-lg text-text-muted line-through">${isMonthly ? plan.monthly.price : plan.yearly.monthlyEquivalent.toFixed(2)}</span>
                      <span className="text-3xl font-bold ml-2 text-emerald-600">${isMonthly ? displayPrice.toFixed(2) : (displayPrice / 12).toFixed(2)}</span>
                      <span className="text-text-muted text-sm">/mo</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold">${isMonthly ? plan.monthly.price : plan.yearly.monthlyEquivalent.toFixed(2)}</span>
                      <span className="text-text-muted text-sm">/mo</span>
                    </>
                  )}
                </div>
                {!isMonthly && !hasCoupon && (
                  <div className="mt-1">
                    <p className="text-xs text-text-muted">Billed ${plan.yearly.totalPrice}/year</p>
                    <p className="text-xs text-emerald-600 font-medium">Save ${plan.yearly.savings}/year</p>
                  </div>
                )}
                {hasCoupon && (
                  <div className="mt-1">
                    <p className="text-xs text-emerald-600 font-medium">
                      {isMonthly ? `Pay $${displayPrice.toFixed(2)}/month` : `Pay $${displayPrice.toFixed(2)}/year`}
                      {" "}(was ${basePrice})
                    </p>
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
                <div className="space-y-2">
                  {/* Per-plan coupon apply */}
                  {appliedCoupon && selectedPlanForCoupon !== plan.tier && couponCode && (
                    <Button variant="secondary" size="sm" className="w-full" onClick={() => handleApplyCoupon(plan.tier)} disabled={couponLoading}>
                      <Tag className="w-3.5 h-3.5" /> Apply {appliedCoupon.code} to this plan
                    </Button>
                  )}
                  <Button variant={plan.popular ? "primary" : "secondary"} className="w-full" onClick={() => handleSubscribe(plan.tier)} disabled={loading === plan.tier}>
                    {loading === plan.tier ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    {loading === plan.tier ? "Processing..." : hasCoupon ? `Pay $${displayPrice.toFixed(2)}` : "Upgrade"}
                  </Button>
                </div>
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
