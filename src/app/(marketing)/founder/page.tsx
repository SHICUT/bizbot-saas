import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/marketing/StructuredData";
import { Building2, Lightbulb, Code2, Rocket, Mail, ExternalLink } from "lucide-react";

export const metadata: Metadata = {
  title: "Shivam Kumar | Founder of FlowNex & Circle Creation",
  description:
    "Shivam Kumar is the Founder & CEO of FlowNex and Circle Creation. Learn about his vision for AI-powered customer automation and how he built FlowNex.",
  keywords: [
    "Shivam Kumar",
    "FlowNex founder",
    "Circle Creation founder",
    "CEO FlowNex",
    "AI automation entrepreneur",
  ],
  alternates: { canonical: "https://www.flownex.in/founder" },
  openGraph: {
    title: "Shivam Kumar — Founder of FlowNex & Circle Creation",
    description: "Meet the founder behind FlowNex, the AI customer automation platform by Circle Creation.",
    url: "https://www.flownex.in/founder",
  },
  twitter: {
    title: "Shivam Kumar — Founder, FlowNex & Circle Creation",
    description: "Building AI-powered customer automation at FlowNex.",
  },
};

export default function FounderPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/"><img src="/brand/logo-full.png" alt="FlowNex by Circle Creation" className="h-7 object-contain" /></Link>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900">About</Link>
            <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900">Contact</Link>
          </div>
        </div>
      </nav>

      <BreadcrumbSchema items={[
        { name: "Home", url: "https://www.flownex.in" },
        { name: "Founder", url: "https://www.flownex.in/founder" },
      ]} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <section className="text-center mb-16">
          <div className="w-32 h-32 rounded-full gradient-primary flex items-center justify-center text-white text-4xl font-bold mx-auto mb-6 shadow-xl">
            SK
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">Shivam Kumar</h1>
          <p className="text-lg text-primary font-semibold mb-2">Founder & CEO, FlowNex</p>
          <p className="text-gray-600">Founder, Circle Creation</p>
          <div className="flex items-center justify-center gap-4 mt-6">
            <a href="mailto:shivam95ku@gmail.com" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors">
              <Mail className="w-4 h-4" /> Email
            </a>
            <a href="https://linkedin.com/in/shivamkumar" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors">
              <ExternalLink className="w-4 h-4" /> LinkedIn
            </a>
            <a href="https://twitter.com/circlecreation" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors">
              <ExternalLink className="w-4 h-4" /> X / Twitter
            </a>
          </div>
        </section>

        {/* Story */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">The Story Behind FlowNex</h2>
          <div className="prose prose-gray max-w-none text-gray-600 leading-relaxed space-y-4">
            <p>
              Shivam Kumar noticed a recurring problem across service-based businesses in India — leads were being lost every day simply because businesses couldn't respond fast enough. A customer who messages at 10 PM expecting information about a gym membership, a salon appointment, or a property listing shouldn't have to wait until the next morning.
            </p>
            <p>
              This insight led Shivam to found <strong>Circle Creation</strong> and build <strong>FlowNex</strong> — an AI-powered customer automation platform that ensures no business ever loses a lead due to slow response times. FlowNex uses advanced AI to respond instantly on WhatsApp, capture leads into a CRM, and book appointments — all without human intervention.
            </p>
            <p>
              Today, FlowNex serves businesses across real estate, healthcare, fitness, education, and hospitality sectors, helping them capture more leads, book more appointments, and grow revenue through intelligent automation.
            </p>
          </div>
        </section>

        {/* Roles */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Roles & Responsibilities</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Founder & CEO</h3>
              <p className="text-sm text-gray-600">FlowNex — AI Customer Automation Platform</p>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
                <Rocket className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Founder</h3>
              <p className="text-sm text-gray-600">Circle Creation — Technology Company</p>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
                <Code2 className="w-5 h-5 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Product Architect</h3>
              <p className="text-sm text-gray-600">Full-stack development & AI integration</p>
            </div>
            <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-xl p-6">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center mb-3">
                <Lightbulb className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Visionary</h3>
              <p className="text-sm text-gray-600">AI-first approach to business automation</p>
            </div>
          </div>
        </section>

        {/* Entity Relationship */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Entity Relationship</h2>
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-gray-900">Shivam Kumar</div>
              <div className="text-sm text-gray-500">↓ Founder of</div>
              <div className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-semibold text-gray-900">Circle Creation</div>
              <div className="text-sm text-gray-500">↓ Creator of</div>
              <div className="px-6 py-3 gradient-primary text-white rounded-xl font-semibold">FlowNex</div>
              <p className="text-xs text-gray-400 mt-2">AI Customer Automation Platform</p>
            </div>
          </div>
        </section>

        {/* Bottom */}
        <section className="border-t border-gray-100 pt-10 text-center">
          <p className="text-sm text-gray-500">
            Built by Circle Creation · Founded by Shivam Kumar
          </p>
          <p className="text-xs text-gray-400 mt-1">
            © 2026 Circle Creation. All Rights Reserved.
          </p>
        </section>
      </main>
    </div>
  );
}
