import type { Metadata } from "next";
import Link from "next/link";
import { BreadcrumbSchema } from "@/components/marketing/StructuredData";
import { Calendar, User, ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog — FlowNex AI Customer Automation Insights",
  description:
    "Read articles about AI customer automation, WhatsApp marketing, lead capture strategies, and business growth tips from FlowNex by Circle Creation.",
  keywords: [
    "FlowNex blog",
    "AI automation blog",
    "WhatsApp marketing tips",
    "lead capture strategies",
    "business automation insights",
  ],
  alternates: { canonical: "https://www.flownex.in/blog" },
  openGraph: {
    title: "FlowNex Blog — AI Customer Automation Insights",
    description: "Expert articles on WhatsApp automation, AI lead capture, and business growth.",
    url: "https://www.flownex.in/blog",
  },
};

const BLOG_POSTS = [
  {
    slug: "what-is-ai-customer-automation",
    title: "What is AI Customer Automation?",
    excerpt: "Discover how AI customer automation transforms business communication, reduces response times, and increases conversions without hiring more staff.",
    date: "July 10, 2026",
    readTime: "5 min",
    category: "AI & Automation",
  },
  {
    slug: "whatsapp-automation-lead-capture",
    title: "How WhatsApp Automation Helps Businesses Capture More Leads",
    excerpt: "Learn why WhatsApp is the #1 channel for business leads and how automation ensures you never miss a single inquiry.",
    date: "July 5, 2026",
    readTime: "6 min",
    category: "Lead Generation",
  },
  {
    slug: "why-businesses-lose-leads-without-instant-replies",
    title: "Why Businesses Lose Leads Without Instant Replies",
    excerpt: "Research shows 78% of customers buy from the first responder. See why response speed is your biggest competitive advantage.",
    date: "June 28, 2026",
    readTime: "4 min",
    category: "Business Strategy",
  },
  {
    slug: "best-ai-crm-real-estate",
    title: "Best AI CRM & Automation Platform for Real Estate",
    excerpt: "Real estate agents lose 60% of leads to slow responses. See how AI automation captures every property inquiry and schedules site visits automatically.",
    date: "June 20, 2026",
    readTime: "7 min",
    category: "Real Estate",
  },
  {
    slug: "how-flownex-works",
    title: "How FlowNex Works — Complete Platform Guide",
    excerpt: "A step-by-step guide to setting up FlowNex, training your AI, and automating customer conversations in under 5 minutes.",
    date: "June 12, 2026",
    readTime: "8 min",
    category: "Product Guide",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/"><img src="/brand/logo-full.png" alt="FlowNex by Circle Creation" className="h-7 object-contain" /></Link>
          <div className="flex items-center gap-4">
            <Link href="/features" className="text-sm text-gray-600 hover:text-gray-900">Features</Link>
            <Link href="/register" className="text-sm font-semibold text-white gradient-primary px-4 py-2 rounded-lg">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      <BreadcrumbSchema items={[
        { name: "Home", url: "https://www.flownex.in" },
        { name: "Blog", url: "https://www.flownex.in/blog" },
      ]} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-14">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            FlowNex <span className="gradient-text">Blog</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Insights on AI customer automation, WhatsApp marketing, and business growth strategies. By Shivam Kumar, Founder of Circle Creation.
          </p>
        </div>

        <div className="space-y-6">
          {BLOG_POSTS.map((post) => (
            <Link key={post.slug} href={`/blog/${post.slug}`} className="block bg-white border border-gray-100 rounded-2xl p-7 hover:shadow-md hover:border-gray-200 transition-all group">
              <div className="flex items-center gap-3 mb-3">
                <span className="px-3 py-1 bg-primary/5 text-primary text-xs font-semibold rounded-full">{post.category}</span>
                <span className="text-xs text-gray-400">{post.readTime} read</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors">
                {post.title}
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed mb-4">{post.excerpt}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> Shivam Kumar</span>
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {post.date}</span>
                </div>
                <span className="flex items-center gap-1 text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                  Read <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
