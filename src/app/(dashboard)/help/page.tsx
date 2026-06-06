"use client";

import {
  BookOpen, MessageSquare, Phone, Image, Calendar, CreditCard,
  Zap, ArrowRight, HelpCircle, Settings, Megaphone, Bot
} from "lucide-react";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/layout/PageHeader";

interface HelpItem {
  title: string;
  description: string;
  icon: typeof BookOpen;
  href: string;
  color: string;
  bgColor: string;
}

const helpSections: HelpItem[] = [
  {
    title: "Getting Started",
    description: "Complete your business setup and get BizBot running in minutes. Follow our step-by-step guide.",
    icon: Zap,
    href: "/knowledge",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  {
    title: "Connect WhatsApp",
    description: "Link your WhatsApp Business number to start receiving customer messages and let AI respond.",
    icon: Phone,
    href: "/settings",
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "Upload Media",
    description: "Add pricing charts, menus, brochures, and offers. AI will automatically send them to customers.",
    icon: Image,
    href: "/media",
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Knowledge Base",
    description: "Tell BizBot about your business — services, pricing, FAQs. The more you add, the smarter AI replies become.",
    icon: BookOpen,
    href: "/knowledge",
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    title: "Broadcasts & Campaigns",
    description: "Send promotions and announcements to your customers via WhatsApp. Set up safely with daily limits.",
    icon: Megaphone,
    href: "/broadcasts",
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    title: "Appointments",
    description: "Manage customer bookings. Customers can book through WhatsApp, and you can track everything here.",
    icon: Calendar,
    href: "/appointments",
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    title: "AI Settings",
    description: "Configure how your AI assistant responds — tone, language, follow-up timing, and more.",
    icon: Bot,
    href: "/automations",
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
  {
    title: "Billing & Plans",
    description: "View your current plan, upgrade for more messages, or manage your subscription.",
    icon: CreditCard,
    href: "/billing",
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
];

export default function HelpPage() {
  return (
    <div>
      <PageHeader
        title="Help Center"
        description="Everything you need to get the most out of BizBot"
      />

      {/* Quick Start Banner */}
      <Card className="mb-6 bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-100">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-primary mb-1">New to BizBot?</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Follow these steps to get started: <span className="font-medium">1.</span> Fill your Knowledge Base →{" "}
              <span className="font-medium">2.</span> Connect WhatsApp →{" "}
              <span className="font-medium">3.</span> Upload media →{" "}
              <span className="font-medium">4.</span> Start receiving customers!
            </p>
          </div>
        </div>
      </Card>

      {/* Help Sections Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {helpSections.map((item) => (
          <a key={item.title} href={item.href} className="block group">
            <Card className="h-full hover:shadow-md hover:ring-1 hover:ring-primary/10 transition-all">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg ${item.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <item.icon className={`w-5 h-5 ${item.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-text-primary">{item.title}</h4>
                    <ArrowRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <p className="text-xs text-text-muted mt-1 leading-relaxed">{item.description}</p>
                </div>
              </div>
            </Card>
          </a>
        ))}
      </div>

      {/* Contact Support */}
      <Card className="mt-6">
        <div className="text-center py-4">
          <MessageSquare className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold mb-1">Still need help?</h3>
          <p className="text-xs text-text-muted mb-3">Our support team is available on WhatsApp for instant help.</p>
          <a
            href="https://wa.me/919572495969?text=Hi%2C%20I%20need%20help%20with%20BizBot."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            Chat with Support
          </a>
        </div>
      </Card>
    </div>
  );
}
