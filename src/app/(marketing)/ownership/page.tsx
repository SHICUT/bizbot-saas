import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/marketing/StructuredData";
import { Shield, FileText, Calendar, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Ownership & Copyright — FlowNex by Circle Creation",
  description:
    "FlowNex is a proprietary software product fully developed, maintained, and owned by Circle Creation. Founded by Shivam Kumar.",
  keywords: [
    "FlowNex ownership",
    "Circle Creation copyright",
    "Shivam Kumar FlowNex",
    "FlowNex intellectual property",
  ],
  alternates: { canonical: "https://www.flownex.in/ownership" },
  openGraph: {
    title: "FlowNex Ownership — Circle Creation",
    description:
      "FlowNex is proprietary software owned by Circle Creation, founded by Shivam Kumar.",
    url: "https://www.flownex.in/ownership",
  },
};

export default function OwnershipPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/">
            <img src="/brand/logo-full.png" alt="FlowNex" className="h-7 object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900">About</Link>
            <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign In</Link>
          </div>
        </div>
      </nav>

      <BreadcrumbSchema
        items={[
          { name: "Home", url: "https://www.flownex.in" },
          { name: "Ownership", url: "https://www.flownex.in/ownership" },
        ]}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Ownership & Copyright</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            FlowNex is a proprietary software product fully developed, maintained, and owned by Circle Creation.
          </p>
        </div>

        {/* Legal Ownership Declaration */}
        <section className="mb-12">
          <div className="gradient-primary rounded-2xl p-8 sm:p-10 text-white">
            <div className="flex items-start gap-4">
              <Shield className="w-8 h-8 flex-shrink-0 mt-1" />
              <div>
                <h2 className="text-xl font-bold mb-3">Legal Ownership Declaration</h2>
                <p className="text-white/90 leading-relaxed">
                  FlowNex is a proprietary software product fully developed, maintained, and owned by
                  <strong> Circle Creation</strong>. All rights, title, and interest in and to the FlowNex
                  platform, including all associated intellectual property rights, are exclusively owned by
                  Circle Creation, founded by <strong>Shivam Kumar</strong>.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Company Details */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Building2 className="w-6 h-6 text-primary" /> Company Information
          </h2>
          <div className="bg-gray-50 rounded-2xl p-8">
            <dl className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 sm:w-48">Company Name</dt>
                <dd className="text-base font-semibold text-gray-900">Circle Creation</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 sm:w-48">Product Name</dt>
                <dd className="text-base font-semibold text-gray-900">FlowNex</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 sm:w-48">Founder & Owner</dt>
                <dd className="text-base font-semibold text-gray-900">Shivam Kumar</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 sm:w-48">Website</dt>
                <dd className="text-base font-semibold text-primary">flownex.in</dd>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                <dt className="text-sm font-medium text-gray-500 sm:w-48">Contact</dt>
                <dd className="text-base font-semibold text-gray-900">shivam95ku@gmail.com</dd>
              </div>
            </dl>
          </div>
        </section>

        {/* Development Timeline */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary" /> Development Timeline
          </h2>
          <div className="space-y-4">
            {[
              { date: "Q1 2025", event: "Concept & market research initiated by Shivam Kumar" },
              { date: "Q2 2025", event: "Circle Creation established; FlowNex development begins" },
              { date: "Q3 2025", event: "Core WhatsApp Business API integration completed" },
              { date: "Q4 2025", event: "AI-powered auto-reply and lead capture engine built" },
              { date: "Q1 2026", event: "Beta launch with select businesses; appointment booking added" },
              { date: "Q2 2026", event: "Public launch — full multi-tenant SaaS platform live" },
              { date: "Q3 2026", event: "AI Sales Assistant, analytics, and automation workflows shipped" },
            ].map((item) => (
              <div key={item.date} className="flex gap-4 items-start">
                <div className="w-24 flex-shrink-0">
                  <span className="text-sm font-semibold text-primary">{item.date}</span>
                </div>
                <div className="flex-1 bg-white border border-gray-100 rounded-lg p-4">
                  <p className="text-sm text-gray-700">{item.event}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Copyright Statement */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
            <FileText className="w-6 h-6 text-primary" /> Copyright Statement
          </h2>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 space-y-4">
            <p className="text-sm text-gray-700 leading-relaxed">
              <strong>Copyright © 2026 Circle Creation. All Rights Reserved.</strong>
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              All software code, branding assets, designs, logos, documentation, and intellectual property
              related to FlowNex are exclusively owned by Circle Creation.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              No part of this software, including its source code, user interface designs, algorithms,
              or branding materials, may be reproduced, distributed, transmitted, displayed, published,
              or broadcast without the prior written permission of Circle Creation.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              Unauthorized reproduction, modification, distribution, or use of any proprietary material
              belonging to Circle Creation and FlowNex is strictly prohibited and may result in civil
              and criminal penalties.
            </p>
            <p className="text-sm text-gray-500 mt-4 italic">
              For licensing inquiries, please contact: shivam95ku@gmail.com
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
