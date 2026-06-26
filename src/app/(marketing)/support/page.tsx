"use client";

import Link from "next/link";
import { MessageSquare, Mail, Phone, Clock } from "lucide-react";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/"><img src="/brand/logo-full.png" alt="FlowNex" className="h-7 object-contain" /></Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign In</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Support</h1>
        <p className="text-gray-600 mb-8">We&apos;re here to help. Reach out through any of the channels below.</p>

        <div className="grid sm:grid-cols-2 gap-4 mb-12">
          <a href="https://wa.me/919572495969?text=Hi%2C%20I%20need%20help%20with%20FlowNex" target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"><MessageSquare className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-sm font-semibold text-gray-900">WhatsApp Support</p><p className="text-xs text-gray-500 mt-1">Fastest response. Chat with us directly.</p></div>
          </a>
          <a href="mailto:support@flownex.in" className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 hover:border-blue-200 hover:bg-blue-50/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0"><Mail className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-sm font-semibold text-gray-900">Email Support</p><p className="text-xs text-gray-500 mt-1">support@flownex.in — Response within 24h</p></div>
          </a>
          <a href="tel:+919572495969" className="flex items-start gap-4 p-5 rounded-xl border border-gray-200 hover:border-purple-200 hover:bg-purple-50/30 transition-all">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0"><Phone className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-sm font-semibold text-gray-900">Phone</p><p className="text-xs text-gray-500 mt-1">+91 95724 95969</p></div>
          </a>
          <div className="flex items-start gap-4 p-5 rounded-xl border border-gray-200">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0"><Clock className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-sm font-semibold text-gray-900">Business Hours</p><p className="text-xs text-gray-500 mt-1">Mon–Sat, 10 AM – 7 PM IST</p></div>
          </div>
        </div>

        <div className="rounded-xl bg-gray-50 border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Frequently Needed Help</h2>
          <ul className="space-y-2 text-sm text-gray-700">
            <li>• <strong>WhatsApp not connecting:</strong> Ensure your Meta App has WhatsApp product enabled and Business Verification is complete.</li>
            <li>• <strong>AI not replying:</strong> Check Settings → verify WhatsApp is connected and AI is enabled.</li>
            <li>• <strong>Billing issues:</strong> Contact us with your registered email for subscription support.</li>
            <li>• <strong>Account deletion:</strong> Email privacy@flownex.in with your request.</li>
            <li>• <strong>Data export:</strong> Contact support to request a data export.</li>
          </ul>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-4 text-sm text-gray-500">
          <Link href="/privacy-policy" className="hover:text-gray-700">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-700">Terms of Service</Link>
          <Link href="/support" className="hover:text-gray-700 font-medium text-gray-900">Support</Link>
        </div>
      </main>
    </div>
  );
}
