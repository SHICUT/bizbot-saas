"use client";

import Link from "next/link";
import {
  MessageSquare, Users, Calendar, Bot, BarChart2, Zap,
  CheckCircle, ArrowRight, Star, Phone, Clock, Shield,
  ChevronDown
} from "lucide-react";

const FEATURES = [
  { icon: MessageSquare, title: "Instant AI Replies", desc: "Respond to every WhatsApp inquiry in under 3 seconds — 24/7, even while you sleep.", color: "blue" },
  { icon: Users, title: "Automatic Lead Capture", desc: "Every conversation automatically becomes a tracked lead in your CRM pipeline.", color: "purple" },
  { icon: Calendar, title: "Smart Appointments", desc: "AI books appointments directly from chat. No back-and-forth scheduling needed.", color: "blue" },
  { icon: Bot, title: "Follow-Up Automation", desc: "3-step follow-up sequences re-engage cold leads automatically.", color: "purple" },
  { icon: BarChart2, title: "Revenue Analytics", desc: "Track conversion rates, AI performance, and revenue attribution in real-time.", color: "blue" },
  { icon: Shield, title: "Enterprise Security", desc: "Bank-grade encryption, row-level isolation, and complete data privacy per business.", color: "purple" },
];

const STATS = [
  { value: "3s", label: "Avg. Response Time" },
  { value: "24/7", label: "Always Available" },
  { value: "85%", label: "Lead Capture Rate" },
  { value: "3x", label: "More Appointments" },
];

const TESTIMONIALS = [
  { name: "Rahul S.", role: "Gym Owner, Mumbai", text: "FlowNex handles 90% of my inquiries automatically. I went from missing leads to booking 3x more trial sessions.", rating: 5 },
  { name: "Priya M.", role: "Salon Owner, Delhi", text: "My customers get instant replies even at midnight. Appointment bookings doubled in the first month.", rating: 5 },
  { name: "Amit K.", role: "Real Estate Agent, Bangalore", text: "Every property inquiry is now captured and followed up. I closed 4 extra deals last quarter thanks to FlowNex.", rating: 5 },
];

const FAQS = [
  { q: "How does FlowNex connect to my WhatsApp?", a: "FlowNex uses the official WhatsApp Business API (Meta-approved). You connect your business number through our simple setup wizard — no technical skills needed." },
  { q: "Will customers know they're talking to AI?", a: "No. FlowNex responds like a real human team member. It uses your business knowledge, tone, and language to craft natural conversations." },
  { q: "What happens when the AI can't answer?", a: "FlowNex seamlessly hands off to you or your team. You get notified instantly and can take over any conversation at any time." },
  { q: "Is there a free trial?", a: "Yes! 7-day free trial with 100 AI replies. No credit card required. Start in under 5 minutes." },
  { q: "Which business types does FlowNex support?", a: "Gyms, salons, clinics, restaurants, real estate, coaching centers, and any service-based business. The AI adapts to your specific industry." },
  { q: "Can I customize what the AI says?", a: "Absolutely. You fill in your Knowledge Base (services, pricing, FAQs, policies) and the AI uses only your data to respond. You control the tone, language, and personality." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* ─── Navigation ─── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <img src="/brand/logo-full.png" alt="FlowNex" className="h-8 object-contain" />
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#how-it-works" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">How It Works</a>
            <a href="#pricing" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
            <a href="#faq" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-700 hover:text-gray-900 px-4 py-2 rounded-lg transition-colors">Sign In</Link>
            <Link href="/register" className="text-sm font-semibold text-white gradient-primary px-5 py-2.5 rounded-lg hover:opacity-90 transition-all shadow-sm">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative overflow-hidden pt-20 pb-28 sm:pt-28 sm:pb-36">
        <div className="absolute inset-0 gradient-subtle opacity-60" />
        <div className="absolute top-[-200px] right-[-100px] w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute bottom-[-200px] left-[-100px] w-[500px] h-[500px] rounded-full bg-secondary/5 blur-[100px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/5 border border-primary/10 mb-8">
            <Zap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-semibold text-primary">AI-Powered WhatsApp Automation</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 tracking-tight leading-[1.1] mb-6 max-w-4xl mx-auto">
            Never Miss Another
            <span className="gradient-text"> Lead </span>
            Again
          </h1>

          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            FlowNex AI responds instantly to every WhatsApp inquiry, captures leads, and books appointments automatically — so you never lose a customer to slow response times.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link href="/register" className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white gradient-primary rounded-xl hover:opacity-90 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2">
              Start Free Trial <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="https://wa.me/919572495969?text=Hi%2C%20I%20want%20a%20demo%20of%20FlowNex" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-gray-700 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all flex items-center justify-center gap-2">
              <Phone className="w-4 h-4" /> Book a Demo
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold gradient-text">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ─── */}
      <section id="features" className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Everything You Need to Convert More Leads</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">One platform to capture, engage, and convert every customer conversation into revenue.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
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
        </div>
      </section>

      {/* ─── How It Works ─── */}
      <section id="how-it-works" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Up and Running in 5 Minutes</h2>
            <p className="text-lg text-gray-600">No coding. No complex setup. Just connect and go.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              { step: "1", title: "Connect WhatsApp", desc: "Link your WhatsApp Business number through our guided setup. Takes under 2 minutes." },
              { step: "2", title: "Train Your AI", desc: "Add your services, pricing, FAQs, and business info. FlowNex learns everything about your business." },
              { step: "3", title: "Start Converting", desc: "AI handles inquiries, captures leads, books appointments, and follows up — automatically." },
            ].map((s) => (
              <div key={s.step} className="text-center">
                <div className="w-14 h-14 rounded-2xl gradient-primary text-white text-xl font-bold flex items-center justify-center mx-auto mb-5 shadow-md">{s.step}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className="py-24 bg-gray-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Businesses Love FlowNex</h2>
            <p className="text-lg text-gray-600">Real results from real businesses.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t) => (
              <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-7 hover:shadow-md transition-all">
                <div className="flex gap-0.5 mb-4">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-5">&ldquo;{t.text}&rdquo;</p>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing Preview ─── */}
      <section id="pricing" className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-lg text-gray-600">Start free. Upgrade when you grow.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              { name: "Starter", price: "19", replies: "1K", features: ["AI Auto Reply", "Lead CRM", "Knowledge Base", "Basic Analytics"] },
              { name: "Growth", price: "49", replies: "5K", popular: true, features: ["Everything in Starter", "Broadcasts", "Appointments", "Follow-Up Automation"] },
              { name: "Business", price: "99", replies: "20K", features: ["Everything in Growth", "AI Sales Agent", "Multi-Agent", "Advanced Analytics"] },
            ].map((plan) => (
              <div key={plan.name} className={`rounded-2xl border p-8 ${plan.popular ? "border-primary ring-2 ring-primary/20 relative" : "border-gray-200"}`}>
                {plan.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full gradient-primary text-white text-xs font-semibold">Most Popular</span>}
                <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-1">{plan.replies} AI Replies/month</p>
                <div className="mt-4 mb-6">
                  <span className="text-4xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-500">/mo</span>
                </div>
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
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="py-24 bg-gray-50/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-4">
            {FAQS.map((faq) => (
              <details key={faq.q} className="group bg-white rounded-xl border border-gray-100 overflow-hidden">
                <summary className="flex items-center justify-between p-5 cursor-pointer list-none">
                  <span className="text-sm font-medium text-gray-900 pr-4">{faq.q}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400 group-open:rotate-180 transition-transform flex-shrink-0" />
                </summary>
                <div className="px-5 pb-5 pt-0">
                  <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="gradient-primary rounded-3xl p-12 sm:p-16 relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Ready to Convert More Leads?</h2>
              <p className="text-white/70 text-lg mb-8 max-w-xl mx-auto">Start your 7-day free trial today. No credit card required. Set up in under 5 minutes.</p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/register" className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-primary bg-white rounded-xl hover:bg-gray-50 transition-all shadow-md flex items-center justify-center gap-2">
                  Start Free Trial <ArrowRight className="w-4 h-4" />
                </Link>
                <a href="https://wa.me/919572495969?text=Hi%2C%20I%20want%20to%20know%20more%20about%20FlowNex" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white border border-white/30 rounded-xl hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                  <MessageSquare className="w-4 h-4" /> Chat on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <img src="/brand/logo-full.png" alt="FlowNex" className="h-7 object-contain" />
            <p className="text-sm text-gray-500">© {new Date().getFullYear()} FlowNex. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <Link href="/login" className="text-sm text-gray-500 hover:text-gray-700">Sign In</Link>
              <Link href="/register" className="text-sm text-gray-500 hover:text-gray-700">Sign Up</Link>
              <a href="mailto:shivam95ku@gmail.com" className="text-sm text-gray-500 hover:text-gray-700">Contact</a>
            </div>
          </div>
        </div>
      </footer>

      {/* ─── Floating WhatsApp CTA ─── */}
      <a
        href="https://wa.me/919572495969?text=Hi%2C%20I%20want%20to%20know%20more%20about%20FlowNex"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-full bg-emerald-500 text-white text-sm font-semibold shadow-lg hover:bg-emerald-600 hover:shadow-xl hover:scale-105 transition-all"
      >
        <MessageSquare className="w-4 h-4" />
        <span className="hidden sm:inline">Chat with us</span>
      </a>
    </div>
  );
}
