import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/marketing/StructuredData";
import { CheckCircle, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Pricing — FlowNex AI Customer Automation Plans",
  description:
    "FlowNex pricing plans starting at $19/month. AI auto-reply, lead capture, appointment booking, and WhatsApp automation. 7-day free trial. By Circle Creation.",
  keywords: [
    "FlowNex pricing",
    "WhatsApp automation pricing",
    "AI CRM pricing",
    "business automation cost",
    "appointment booking software price",
  ],
  alternates: { canonical: "https://www.flownex.in/pricing" },
  openGraph: {
    title: "FlowNex Pricing — Plans Starting at $19/month",
    description: "Simple, transparent pricing for AI WhatsApp automation. Start free, upgrade when you grow.",
    url: "https://www.flownex.in/pricing",
  },
};

const PLANS = [
  {
    name: "Starter",
    price: "19",
    replies: "1,000",
    desc: "For solo entrepreneurs getting started with automation",
    features: [
      "AI Auto Reply",
      "Lead CRM",
      "Knowledge Base",
      "Basic Analytics",
      "1 WhatsApp Number",
      "Email Support",
    ],
  },
  {
    name: "Growth",
    price: "49",
    replies: "5,000",
    popular: true,
    desc: "For growing businesses that want full automation",
    features: [
      "Everything in Starter",
      "Broadcast Campaigns",
      "Appointment Booking",
      "Follow-Up Automation",
      "Advanced Analytics",
      "Priority Support",
    ],
  },
  {
    name: "Business",
    price: "99",
    replies: "20,000",
    desc: "For established businesses scaling customer engagement",
    features: [
      "Everything in Growth",
      "AI Sales Agent",
      "Multi-Agent Support",
      "Revenue Analytics",
      "Custom Integrations",
      "Dedicated Account Manager",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/"><img src="/brand/logo-full.png" alt="FlowNex by Circle Creation" className="h-7 object-contain" /></Link>
          <div className="flex items-center gap-4">
            <Link href="/features" className="text-sm text-gray-600 hover:text-gray-900">Features</Link>
            <Link href="/register" className="text-sm font-semibold text-white gradient-primary px-4 py-2 rounded-lg">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      <BreadcrumbSchema items={[
        { name: "Home", url: "https://www.flownex.in" },
        { name: "Pricing", url: "https://www.flownex.in/pricing" },
      ]} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Simple, Transparent <span className="gradient-text">Pricing</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Start free. Upgrade when you grow. No hidden fees.
          </p>
          <p className="text-sm text-gray-500 mt-2">7-day free trial on all plans. No credit card required.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-16">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border p-8 ${plan.popular ? "border-primary ring-2 ring-primary/20 relative" : "border-gray-200"}`}>
              {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-white text-xs font-semibold">Most Popular</span>}
              <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{plan.desc}</p>
              <div className="mt-4 mb-2">
                <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                <span className="text-gray-500">/mo</span>
              </div>
              <p className="text-xs text-gray-500 mb-6">{plan.replies} AI Replies/month</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />{f}
                  </li>
                ))}
              </ul>
              <Link href="/register" className={`block text-center py-3 rounded-xl text-sm font-semibold transition-all ${plan.popular ? "gradient-primary text-white hover:opacity-90 shadow-sm" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                Start Free Trial
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center bg-gray-50 rounded-2xl p-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Need a Custom Plan?</h2>
          <p className="text-gray-600 mb-6">For enterprises with high-volume needs, we offer custom pricing and dedicated support.</p>
          <Link href="/contact" className="inline-flex items-center gap-2 px-6 py-3 gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-all">
            Contact Sales <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}
