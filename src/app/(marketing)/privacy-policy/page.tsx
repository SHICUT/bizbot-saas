"use client";

import Link from "next/link";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/"><img src="/brand/logo-full.png" alt="FlowNex" className="h-7 object-contain" /></Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign In</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

        <div className="prose prose-gray prose-sm max-w-none space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">1. Introduction</h2>
            <p>FlowNex (&ldquo;we,&rdquo; &ldquo;our,&rdquo; or &ldquo;us&rdquo;) operates the FlowNex AI platform accessible at flownex.in. This Privacy Policy describes how we collect, use, store, and protect your personal information when you use our AI-powered WhatsApp automation and customer management services.</p>
            <p>By using FlowNex, you agree to the collection and use of information in accordance with this policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">2. Information We Collect</h2>
            <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Account Information</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>Name, email address, and phone number provided during registration</li>
              <li>Business name, type, address, and operating hours</li>
              <li>Payment and billing information processed through Razorpay</li>
            </ul>
            <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">WhatsApp Business Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>WhatsApp Business Account ID and Phone Number ID</li>
              <li>Access tokens for the WhatsApp Business API (encrypted at rest)</li>
              <li>Incoming and outgoing message content</li>
              <li>Customer contact information (names, phone numbers) shared via WhatsApp</li>
            </ul>
            <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">Usage Data</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li>AI reply counts and usage metrics</li>
              <li>Appointment bookings and lead pipeline data</li>
              <li>Browser type, IP address, and access times (via server logs)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To provide and maintain the FlowNex platform</li>
              <li>To generate AI-powered responses to your customers on WhatsApp</li>
              <li>To manage leads, appointments, and customer relationships on your behalf</li>
              <li>To process payments and manage subscriptions</li>
              <li>To improve our AI models and service quality</li>
              <li>To send service-related notifications (not marketing)</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">4. WhatsApp Business API Data Handling</h2>
            <p>FlowNex integrates with the Meta WhatsApp Business Cloud API. When you connect your WhatsApp Business number:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>We receive and process messages sent to your WhatsApp Business number</li>
              <li>Message content is processed by our AI to generate automated replies</li>
              <li>Messages are stored in our database to provide conversation history and CRM features</li>
              <li>We do not share message content with third parties except as needed for AI processing</li>
              <li>Access tokens are stored encrypted and are only used to send/receive messages on your behalf</li>
            </ul>
            <p className="mt-2">We comply with Meta&apos;s Platform Terms and WhatsApp Business Policy at all times.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">5. AI Processing Disclaimer</h2>
            <p>FlowNex uses artificial intelligence (powered by Google Gemini, Groq, and OpenAI) to generate automated responses to your customers. By using FlowNex:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>You acknowledge that AI-generated responses may not always be accurate</li>
              <li>You remain responsible for reviewing and managing AI interactions with your customers</li>
              <li>Message content is sent to AI providers for processing but is not used to train their models</li>
              <li>AI processing occurs in real-time and responses are not stored by AI providers</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">6. Cookies & Analytics</h2>
            <p>We use essential cookies for authentication and session management. We do not use third-party tracking cookies or advertising trackers. Server-side analytics are used to monitor platform health and performance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">7. Third-Party Services</h2>
            <p>FlowNex relies on the following third-party services:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Meta (WhatsApp Business API)</strong> — Message sending and receiving</li>
              <li><strong>Groq / Google Gemini / OpenAI</strong> — AI response generation</li>
              <li><strong>Supabase</strong> — Database hosting and authentication</li>
              <li><strong>Vercel</strong> — Application hosting and deployment</li>
              <li><strong>Razorpay</strong> — Payment processing</li>
            </ul>
            <p className="mt-2">Each provider has its own privacy policy. We encourage you to review them.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">8. Data Security</h2>
            <p>We implement industry-standard security measures including:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>HTTPS/TLS encryption for all data in transit</li>
              <li>Row Level Security (RLS) ensuring complete tenant isolation</li>
              <li>Encrypted storage of sensitive credentials (access tokens)</li>
              <li>HMAC signature verification for webhook payloads</li>
              <li>Regular security updates and dependency patching</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">9. Data Retention</h2>
            <p>We retain your data for as long as your account is active. Upon account deletion:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Business data is soft-deleted immediately (hidden from platform)</li>
              <li>Hard deletion occurs 30 days after account closure</li>
              <li>Payment records are retained as required by applicable tax laws</li>
              <li>Aggregated, anonymized analytics may be retained indefinitely</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">10. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data in a portable format</li>
              <li>Withdraw consent for data processing</li>
              <li>Object to automated decision-making</li>
            </ul>
            <p className="mt-2">To exercise these rights, contact us at the email below.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">11. Account Deletion</h2>
            <p>To delete your FlowNex account and all associated data:</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Go to Settings → Contact Support</li>
              <li>Request account deletion</li>
              <li>We will process the request within 7 business days</li>
              <li>All data (leads, conversations, appointments) will be permanently removed after 30 days</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">12. Children&apos;s Privacy</h2>
            <p>FlowNex is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from children. If we learn that we have collected data from a child, we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">13. Contact Information</h2>
            <p>For privacy-related inquiries:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Email: privacy@flownex.in</li>
              <li>Website: https://flownex.in/support</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 mt-8 mb-3">14. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated &ldquo;Last Updated&rdquo; date. Continued use of FlowNex after changes constitutes acceptance of the revised policy.</p>
          </section>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/privacy-policy" className="hover:text-gray-700 font-medium text-gray-900">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-700">Terms of Service</Link>
          <Link href="/support" className="hover:text-gray-700">Support</Link>
        </div>
      </main>
    </div>
  );
}
