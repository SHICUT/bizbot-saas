import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/marketing/StructuredData";
import { Users, Target, Lightbulb, Mail, Phone, MapPin } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us — Circle Creation & FlowNex",
  description:
    "Learn about Circle Creation, the company behind FlowNex. Founded by Shivam Kumar, we build AI-powered customer automation to help businesses grow.",
  keywords: [
    "Circle Creation",
    "FlowNex",
    "About",
    "Shivam Kumar",
    "Founder",
    "AI Customer Automation Company",
  ],
  alternates: { canonical: "https://www.flownex.in/about" },
  openGraph: {
    title: "About Circle Creation — Makers of FlowNex",
    description:
      "Circle Creation develops FlowNex, an AI customer automation platform. Founded by Shivam Kumar.",
    url: "https://www.flownex.in/about",
  },
};

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <img src="/brand/logo-full.png" alt="FlowNex" className="h-7 object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/welcome" className="text-sm text-gray-600 hover:text-gray-900">Home</Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign In</Link>
          </div>
        </div>
      </nav>

      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://www.flownex.in" },
          { name: "About Us", url: "https://www.flownex.in/about" },
        ]}
      />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            About <span className="gradient-text">Circle Creation</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            FlowNex is an AI-powered WhatsApp automation platform developed and owned by Circle Creation.
          </p>
        </div>

        {/* Founder Section */}
        <section className="mb-16">
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl p-8 sm:p-12">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-32 h-32 rounded-full gradient-primary flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                SK
              </div>
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Shivam Kumar</h2>
                <p className="text-primary font-semibold mb-3">Founder & CEO, Circle Creation</p>
                <p className="text-gray-600 leading-relaxed max-w-xl">
                  Shivam Kumar is the founder of Circle Creation and the creator of FlowNex. With a
                  passion for leveraging AI to solve real business problems, Shivam built FlowNex to
                  help service-based businesses never miss another customer due to slow response times.
                </p>
                <div className="flex items-center gap-4 mt-4 justify-center md:justify-start">
                  <a href="mailto:shivam95ku@gmail.com" className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center gap-1">
                    <Mail className="w-4 h-4" /> shivam95ku@gmail.com
                  </a>
                  <a href="https://wa.me/919572495969" className="text-sm text-gray-500 hover:text-primary transition-colors flex items-center gap-1">
                    <Phone className="w-4 h-4" /> +91 9572495969
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="mb-16">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-gray-100 rounded-2xl p-7 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Mission</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                To empower every service-based business with AI-powered communication tools that convert
                more leads, save time, and deliver exceptional customer experiences.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-7 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Vision</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                A world where no business loses a customer due to slow responses. We envision AI handling
                routine conversations so humans can focus on building relationships.
              </p>
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl p-7 hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Our Values</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                Simplicity, reliability, and customer success drive everything we build. We believe
                powerful AI tools should be accessible to businesses of all sizes.
              </p>
            </div>
          </div>
        </section>

        {/* Company Details */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Company Details</h2>
          <div className="bg-gray-50 rounded-2xl p-8">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Company Name</dt>
                <dd className="text-base font-semibold text-gray-900">Circle Creation</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Product Name</dt>
                <dd className="text-base font-semibold text-gray-900">FlowNex</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Founder</dt>
                <dd className="text-base font-semibold text-gray-900">Shivam Kumar</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Industry</dt>
                <dd className="text-base font-semibold text-gray-900">SaaS / AI Technology</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Website</dt>
                <dd className="text-base font-semibold text-primary">flownex.in</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 mb-1">Contact</dt>
                <dd className="text-base font-semibold text-gray-900">shivam95ku@gmail.com</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Contact Section */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            <a href="mailto:shivam95ku@gmail.com" className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-all">
              <Mail className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email</p>
                <p className="text-xs text-gray-500">shivam95ku@gmail.com</p>
              </div>
            </a>
            <a href="https://wa.me/919572495969" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-5 hover:shadow-md transition-all">
              <Phone className="w-5 h-5 text-emerald-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">WhatsApp</p>
                <p className="text-xs text-gray-500">+91 9572495969</p>
              </div>
            </a>
            <div className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-5">
              <MapPin className="w-5 h-5 text-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">Location</p>
                <p className="text-xs text-gray-500">India</p>
              </div>
            </div>
          </div>
        </section>

        {/* Legal Ownership Statement */}
        <section className="border-t border-gray-100 pt-10">
          <div className="bg-gray-50 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-700 font-medium">
              FlowNex is a proprietary software product fully developed, maintained, and owned by Circle Creation.
            </p>
            <p className="text-xs text-gray-500 mt-2">
              All software code, branding assets, designs, and intellectual property related to FlowNex are owned by Circle Creation.
              Unauthorized reproduction is prohibited.
            </p>
            <p className="text-xs text-gray-400 mt-2">Copyright © 2026 Circle Creation. All Rights Reserved.</p>
          </div>
        </section>
      </main>
    </div>
  );
}
