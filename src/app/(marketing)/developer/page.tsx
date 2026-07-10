import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/marketing/StructuredData";
import { Code2, User, Building2, Globe } from "lucide-react";

export const metadata: Metadata = {
  title: "Developer Information — FlowNex by Circle Creation",
  description:
    "FlowNex is developed by Circle Creation. Founder & Product Creator: Shivam Kumar. AI-powered WhatsApp automation platform.",
  keywords: [
    "FlowNex developer",
    "Circle Creation developer",
    "Shivam Kumar developer",
    "FlowNex creator",
  ],
  alternates: { canonical: "https://flownex.in/developer" },
  openGraph: {
    title: "FlowNex Developer Information",
    description: "Developed by Circle Creation. Founder & Product Creator: Shivam Kumar.",
    url: "https://flownex.in/developer",
  },
};

export default function DeveloperPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
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
          { name: "Home", url: "https://flownex.in" },
          { name: "Developer", url: "https://flownex.in/developer" },
        ]}
      />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-16">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Developer Information</h1>

        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-xl gradient-primary flex items-center justify-center">
                <Code2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">FlowNex Platform</h2>
                <p className="text-sm text-gray-500">AI-Powered WhatsApp Automation</p>
              </div>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">Developed By</dt>
                  <dd className="text-base font-semibold text-gray-900">Circle Creation</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">Founder & Product Creator</dt>
                  <dd className="text-base font-semibold text-gray-900">Shivam Kumar</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">Website</dt>
                  <dd className="text-base font-semibold text-primary">flownex.in</dd>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Code2 className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <dt className="text-sm font-medium text-gray-500">Technology</dt>
                  <dd className="text-base font-semibold text-gray-900">Next.js, React, AI/ML, WhatsApp API</dd>
                </div>
              </div>
            </dl>
          </div>

          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Stack</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                "Next.js 16",
                "React 19",
                "TypeScript",
                "Tailwind CSS",
                "Supabase",
                "WhatsApp Business API",
                "OpenAI GPT",
                "Razorpay",
                "Vercel",
              ].map((tech) => (
                <div key={tech} className="bg-white border border-gray-100 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700 text-center">
                  {tech}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-2xl p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">About the Developer</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              FlowNex is conceptualized, designed, and developed by Shivam Kumar, Founder of Circle Creation.
              The platform is built with a focus on performance, security, and accessibility, helping
              service-based businesses automate their WhatsApp customer communications using advanced AI technology.
            </p>
          </div>

          <div className="text-center text-sm text-gray-400 pt-6">
            <p>Copyright © 2026 Circle Creation. All Rights Reserved.</p>
            <p className="mt-1">FlowNex is a product of Circle Creation.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
