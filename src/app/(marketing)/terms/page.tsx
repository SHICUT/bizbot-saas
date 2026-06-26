"use client";

import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/"><img src="/brand/logo-full.png" alt="FlowNex" className="h-7 object-contain" /></Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign In</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

        <div className="prose prose-gray prose-sm max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Acceptance of Terms</h2>
            <p>By accessing or using FlowNex (&ldquo;the Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Description of Service</h2>
            <p>FlowNex is an AI-powered WhatsApp automation platform that helps businesses automatically respond to customer inquiries, capture leads, book appointments, and manage customer relationships through the WhatsApp Business API.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. Account Responsibilities</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>You must provide accurate and complete registration information</li>
              <li>You are responsible for maintaining the security of your account</li>
              <li>You are responsible for all activities under your account</li>
              <li>You must comply with Meta&apos;s WhatsApp Business Policy when using the Service</li>
              <li>You must not use FlowNex to send spam, unsolicited messages, or violate applicable laws</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. Subscription & Payments</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>FlowNex offers a 7-day free trial with limited AI replies</li>
              <li>Paid subscriptions are billed monthly or yearly in USD</li>
              <li>Payments are processed securely through Razorpay</li>
              <li>Subscriptions auto-renew unless cancelled before the renewal date</li>
              <li>Refunds are handled on a case-by-case basis within 7 days of payment</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. AI-Generated Content</h2>
            <p>FlowNex uses artificial intelligence to generate automated replies. You acknowledge that:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>AI responses are generated based on your business knowledge base and training data</li>
              <li>AI may occasionally produce inaccurate or inappropriate responses</li>
              <li>You are ultimately responsible for communications sent to your customers</li>
              <li>You should regularly review AI conversations and adjust settings as needed</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Prohibited Uses</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Sending spam or bulk unsolicited messages</li>
              <li>Violating WhatsApp Business Policy or Meta Platform Terms</li>
              <li>Using the Service for illegal purposes</li>
              <li>Attempting to reverse-engineer or exploit the platform</li>
              <li>Sharing your account credentials with unauthorized parties</li>
              <li>Using the Service to harass, threaten, or harm others</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Service Availability</h2>
            <p>We strive for 99.9% uptime but do not guarantee uninterrupted service. We may perform maintenance, updates, or experience outages beyond our control. We are not liable for any losses caused by service interruptions.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Limitation of Liability</h2>
            <p>FlowNex is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for indirect, incidental, special, or consequential damages arising from your use of the Service, including lost revenue, data loss, or business interruption.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Termination</h2>
            <p>We may suspend or terminate your account if you violate these Terms. You may cancel your account at any time through Settings. Upon termination, your data will be handled according to our Privacy Policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. Changes to Terms</h2>
            <p>We reserve the right to modify these Terms at any time. Material changes will be communicated via email or in-app notification. Continued use after changes constitutes acceptance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">11. Contact</h2>
            <p>For questions about these Terms, contact us at legal@flownex.in or visit flownex.in/support.</p>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/privacy-policy" className="hover:text-gray-700">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-700 font-medium text-gray-900">Terms of Service</Link>
          <Link href="/support" className="hover:text-gray-700">Support</Link>
        </div>
      </main>
    </div>
  );
}
