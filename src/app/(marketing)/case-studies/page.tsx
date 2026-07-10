import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/marketing/StructuredData";
import { TrendingUp, Clock, Users, Calendar, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Case Studies — FlowNex AI WhatsApp Automation Results",
  description:
    "See how businesses use FlowNex AI WhatsApp automation to increase leads, book more appointments, and grow revenue. Real results from real businesses.",
  keywords: [
    "FlowNex case studies",
    "WhatsApp automation results",
    "AI lead generation",
    "appointment booking automation",
    "Circle Creation",
  ],
  alternates: { canonical: "https://flownex.in/case-studies" },
  openGraph: {
    title: "FlowNex Case Studies — Real Business Results",
    description: "Discover how businesses grow with FlowNex AI WhatsApp automation.",
    url: "https://flownex.in/case-studies",
  },
};

const CASE_STUDIES = [
  {
    industry: "Real Estate",
    company: "Prime Realty Group",
    location: "Mumbai",
    problem:
      "Missing 60% of property inquiry leads due to delayed responses. Agents were overwhelmed during peak hours and weekends.",
    solution:
      "Deployed FlowNex AI to instantly respond to all WhatsApp property inquiries, qualify leads by budget and location, and schedule site visits automatically.",
    results: {
      leadsGenerated: "340+ leads/month",
      responseTime: "From 4 hours → 3 seconds",
      appointments: "3x more site visits booked",
      revenue: "4 extra deals closed per quarter",
    },
  },
  {
    industry: "Coaching Institute",
    company: "Excel Academy",
    location: "Delhi",
    problem:
      "High volume of course inquiries during admission season. Staff couldn't handle the load, resulting in lost enrollments.",
    solution:
      "FlowNex AI handles all initial inquiries, shares course details, fee structures, and schedules counseling sessions automatically.",
    results: {
      leadsGenerated: "520+ inquiries handled/month",
      responseTime: "From 2 hours → instant",
      appointments: "85% counseling sessions auto-booked",
      revenue: "40% increase in enrollments",
    },
  },
  {
    industry: "Clinic / Healthcare",
    company: "HealthFirst Clinic",
    location: "Bangalore",
    problem:
      "Patients calling during busy hours couldn't get through. Many switched to competitors offering quicker booking.",
    solution:
      "FlowNex provides instant appointment booking via WhatsApp, sends reminders, and handles rescheduling requests automatically.",
    results: {
      leadsGenerated: "200+ new patients/month",
      responseTime: "From 30 min → 5 seconds",
      appointments: "90% appointments booked via AI",
      revenue: "25% reduction in no-shows",
    },
  },
  {
    industry: "Salon & Spa",
    company: "Glow Studio",
    location: "Pune",
    problem:
      "Receptionist overwhelmed with booking calls. Missed calls during treatment hours led to lost walk-ins at competitor salons.",
    solution:
      "FlowNex handles service inquiries, pricing questions, and books appointments 24/7 without any human intervention.",
    results: {
      leadsGenerated: "150+ bookings/month via WhatsApp",
      responseTime: "From missed calls → instant replies",
      appointments: "2x more appointments booked",
      revenue: "35% revenue increase in 3 months",
    },
  },
  {
    industry: "Hotel & Hospitality",
    company: "StayEase Hotels",
    location: "Jaipur",
    problem:
      "International guests messaging at odd hours received no response. Direct bookings were minimal compared to OTA platforms.",
    solution:
      "FlowNex AI responds in multiple languages, shares room availability, pricing, and completes direct booking via WhatsApp.",
    results: {
      leadsGenerated: "280+ direct inquiries/month",
      responseTime: "24/7 instant responses",
      appointments: "60% increase in direct bookings",
      revenue: "Saved 15% on OTA commissions",
    },
  },
  {
    industry: "Local Business",
    company: "FreshBite Restaurant",
    location: "Hyderabad",
    problem:
      "Customers messaged for menu, timing, and reservation info but rarely got timely responses during rush hours.",
    solution:
      "FlowNex shares digital menu, handles reservation requests, and sends order confirmations automatically via WhatsApp.",
    results: {
      leadsGenerated: "400+ customer interactions/month",
      responseTime: "From 45 min → 2 seconds",
      appointments: "75% reservations booked via AI",
      revenue: "20% increase in table turnover",
    },
  },
];

export default function CaseStudiesPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <img src="/brand/logo-full.png" alt="FlowNex" className="h-7 object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/welcome" className="text-sm text-gray-600 hover:text-gray-900">Home</Link>
            <Link href="/register" className="text-sm font-semibold text-white gradient-primary px-4 py-2 rounded-lg">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://flownex.in" },
          { name: "Case Studies", url: "https://flownex.in/case-studies" },
        ]}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Real Results from <span className="gradient-text">Real Businesses</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            See how businesses across industries use FlowNex to capture more leads, book more appointments, and grow revenue.
          </p>
        </div>

        <div className="space-y-8">
          {CASE_STUDIES.map((study) => (
            <div key={study.company} className="bg-white border border-gray-100 rounded-2xl p-8 hover:shadow-lg transition-all">
              <div className="flex flex-wrap items-center gap-3 mb-5">
                <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full">
                  {study.industry}
                </span>
                <span className="text-sm text-gray-500">{study.company} — {study.location}</span>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                  <h3 className="text-sm font-semibold text-red-600 uppercase tracking-wide mb-2">Problem</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{study.problem}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-blue-600 uppercase tracking-wide mb-2">Solution</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{study.solution}</p>
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-emerald-600 uppercase tracking-wide mb-2">Results</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm text-gray-700">
                      <Users className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {study.results.leadsGenerated}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700">
                      <Clock className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {study.results.responseTime}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700">
                      <Calendar className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {study.results.appointments}
                    </li>
                    <li className="flex items-center gap-2 text-sm text-gray-700">
                      <TrendingUp className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      {study.results.revenue}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          <div className="gradient-primary rounded-2xl p-10 relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-bold text-white mb-3">Ready to Get Similar Results?</h2>
              <p className="text-white/80 mb-6">Start your free trial and see the difference in 7 days.</p>
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
