import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/marketing/StructuredData";
import {
  MessageSquare, Users, Calendar, Bot, BarChart2, Shield,
  Zap, Globe, Bell, Smartphone, Database, ArrowRight
} from "lucide-react";

export const metadata: Metadata = {
  title: "Features — FlowNex AI Customer Automation Platform",
  description:
    "Explore FlowNex features: AI auto-reply, lead capture, appointment booking, follow-up automation, analytics, and WhatsApp Business API integration. Built by Circle Creation.",
  keywords: [
    "FlowNex features",
    "AI auto reply",
    "WhatsApp automation features",
    "lead capture software",
    "appointment booking AI",
    "customer automation features",
  ],
  alternates: { canonical: "https://www.flownex.in/features" },
  openGraph: {
    title: "FlowNex Features — AI Customer Automation",
    description: "Complete feature set for WhatsApp automation, AI lead capture, and appointment booking.",
    url: "https://www.flownex.in/features",
  },
};

const FEATURES = [
  {
    icon: MessageSquare,
    title: "AI Auto-Reply",
    desc: "Respond to every WhatsApp inquiry in under 3 seconds — 24/7, even while you sleep. Uses your business knowledge to craft natural, human-like replies.",
    color: "blue",
  },
  {
    icon: Users,
    title: "Automatic Lead Capture",
    desc: "Every conversation automatically becomes a tracked lead in your CRM pipeline. No lead ever slips through the cracks.",
    color: "purple",
  },
  {
    icon: Calendar,
    title: "Smart Appointment Booking",
    desc: "AI books appointments directly from chat. No back-and-forth scheduling. Integrates with your calendar and sends reminders.",
    color: "blue",
  },
  {
    icon: Bot,
    title: "Follow-Up Automation",
    desc: "3-step follow-up sequences re-engage cold leads automatically. Turn missed opportunities into conversions.",
    color: "purple",
  },
  {
    icon: BarChart2,
    title: "Revenue Analytics",
    desc: "Track conversion rates, AI performance, and revenue attribution in real-time. Know exactly what's working.",
    color: "blue",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "Bank-grade encryption, row-level isolation, and complete data privacy per business. SOC-2 compatible architecture.",
    color: "purple",
  },
  {
    icon: Zap,
    title: "Broadcast Campaigns",
    desc: "Send targeted WhatsApp campaigns to segmented audiences. Track open rates, replies, and conversions.",
    color: "blue",
  },
  {
    icon: Globe,
    title: "Multi-Language Support",
    desc: "AI detects customer language and responds accordingly. Support English, Hindi, and regional languages.",
    color: "purple",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    desc: "Get notified when AI can't handle a query. Seamless human handoff ensures no customer is left waiting.",
    color: "blue",
  },
  {
    icon: Smartphone,
    title: "WhatsApp Business API",
    desc: "Official Meta-approved integration. No unofficial hacks. Reliable, scalable, and compliant.",
    color: "purple",
  },
  {
    icon: Database,
    title: "Knowledge Base",
    desc: "Train your AI with your services, pricing, FAQs, and policies. The AI only uses verified business information.",
    color: "blue",
  },
  {
    icon: Users,
    title: "Multi-Business Support",
    desc: "Manage multiple business locations or brands from a single dashboard. Complete data isolation between tenants.",
    color: "purple",
  },
];

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/"><img src="/brand/logo-full.png" alt="FlowNex by Circle Creation" className="h-7 object-contain" /></Link>
          <div className="flex items-center gap-4">
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</Link>
            <Link href="/register" className="text-sm font-semibold text-white gradient-primary px-4 py-2 rounded-lg">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      <BreadcrumbSchema items={[
        { name: "Home", url: "https://www.flownex.in" },
        { name: "Features", url: "https://www.flownex.in/features" },
      ]} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Powerful Features to <span className="gradient-text">Automate Growth</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything you need to capture, engage, and convert every customer conversation into revenue. Built by Circle Creation.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-lg hover:border-gray-200 transition-all group">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.color === "blue" ? "bg-blue-50 group-hover:bg-blue-100" : "bg-purple-50 group-hover:bg-purple-100"} transition-colors`}>
                <f.icon className={`w-6 h-6 ${f.color === "blue" ? "text-blue-600" : "text-purple-600"}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <div className="gradient-primary rounded-2xl p-10 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white mb-3">Ready to Automate Your Business?</h2>
              <p className="text-white/80 mb-6">Start your 7-day free trial. No credit card required.</p>
              <Link href="/register" className="inline-flex items-center gap-2 px-8 py-3 bg-white text-primary font-semibold rounded-xl hover:bg-gray-50 transition-all shadow-md">
                Start Free Trial <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
