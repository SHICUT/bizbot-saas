import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/marketing/StructuredData";
import { Mail, Phone, MapPin, MessageSquare, Clock } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact Us — FlowNex by Circle Creation",
  description:
    "Get in touch with the FlowNex team at Circle Creation. Contact founder Shivam Kumar for sales, support, or partnership inquiries.",
  keywords: ["FlowNex contact", "Circle Creation contact", "Shivam Kumar contact", "WhatsApp automation support"],
  alternates: { canonical: "https://www.flownex.in/contact" },
  openGraph: {
    title: "Contact FlowNex — Circle Creation",
    description: "Reach out to the FlowNex team for sales, support, or partnerships.",
    url: "https://www.flownex.in/contact",
  },
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/"><img src="/brand/logo-full.png" alt="FlowNex by Circle Creation" className="h-7 object-contain" /></Link>
          <Link href="/login" className="text-sm text-gray-600 hover:text-gray-900">Sign In</Link>
        </div>
      </nav>

      <BreadcrumbSchema items={[
        { name: "Home", url: "https://www.flownex.in" },
        { name: "Contact", url: "https://www.flownex.in/contact" },
      ]} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Get in Touch</h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Have questions about FlowNex? Want a demo? Reach out and we will get back to you within 24 hours.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10">
          {/* Contact Info */}
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900">Contact Information</h2>
            <p className="text-sm text-gray-600">
              FlowNex is built by Circle Creation, founded by Shivam Kumar. We are here to help you automate your business.
            </p>

            <div className="space-y-4">
              <a href="mailto:shivam95ku@gmail.com" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-blue-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">shivam95ku@gmail.com</p>
                </div>
              </a>

              <a href="https://wa.me/919572495969?text=Hi%2C%20I%20want%20to%20know%20more%20about%20FlowNex" target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">WhatsApp</p>
                  <p className="text-sm text-gray-600">+91 9572495969</p>
                </div>
              </a>

              <a href="tel:+919572495969" className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl hover:bg-purple-50 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Phone</p>
                  <p className="text-sm text-gray-600">+91 9572495969</p>
                </div>
              </a>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Response Time</p>
                  <p className="text-sm text-gray-600">Within 24 hours</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Location</p>
                  <p className="text-sm text-gray-600">India</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-gray-50 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Send a Message</h2>
            <form className="space-y-4" action="mailto:shivam95ku@gmail.com" method="GET">
              <div>
                <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-1">Name</label>
                <input id="name" name="name" type="text" placeholder="Your name" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label htmlFor="email" className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                <input id="email" name="email" type="email" placeholder="you@company.com" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label htmlFor="subject" className="text-sm font-medium text-gray-700 block mb-1">Subject</label>
                <input id="subject" name="subject" type="text" placeholder="How can we help?" className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" />
              </div>
              <div>
                <label htmlFor="body" className="text-sm font-medium text-gray-700 block mb-1">Message</label>
                <textarea id="body" name="body" rows={4} placeholder="Tell us about your needs..." className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none resize-none" />
              </div>
              <button type="submit" className="w-full py-3 gradient-primary text-white font-semibold rounded-xl hover:opacity-90 transition-all">
                Send Message
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
