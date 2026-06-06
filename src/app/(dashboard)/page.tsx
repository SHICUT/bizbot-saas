"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users, MessageSquare, Bot, Calendar, Zap, ArrowRight, Loader2,
  CheckCircle, Circle, Settings, TrendingUp, TrendingDown,
  DollarSign, Megaphone, Target, Clock, Phone, ArrowUpRight
} from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { formatUSD } from "@/lib/utils";

interface DashboardData {
  user: { name: string; email: string };
  business: { name: string; plan: string; whatsapp_connected: boolean; type: string; onboarding_completed: boolean; business_context: string } | null;
  subscription: { plan: string; status: string; trial_end: string | null; messages_used: number; message_limit: number; current_period_end: string | null } | null;
  stats: { leads: number; messages: number; conversations: number; appointments: number; messagesUsed: number; messageLimit: number };
  recentConversations: Array<{ id: string; last_message_text: string; last_message_at: string; channel: string; leads: { name: string; phone: string } }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (!data) return <div className="text-center py-16 text-text-muted">Failed to load. Please refresh.</div>;

  const sub = data.subscription;
  const now = new Date();
  const trialEnd = sub?.trial_end ? new Date(sub.trial_end) : null;
  const daysLeft = trialEnd ? Math.min(7, Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / 86400000))) : 0;
  const isTrialing = sub?.status === "trialing";
  const messagesUsed = sub?.messages_used || 0;
  const messageLimit = sub?.message_limit || 100;
  const msgPercent = Math.min(100, Math.round((messagesUsed / messageLimit) * 100));

  const setupSteps = [
    { label: "Business Profile", done: !!data.business?.name, href: "/knowledge" },
    { label: "Knowledge Base", done: !!data.business?.business_context, href: "/knowledge" },
    { label: "AI Configured", done: !!data.business?.type && data.business.type !== "other", href: "/automations" },
    { label: "WhatsApp Connected", done: !!data.business?.whatsapp_connected, href: "/settings" },
    { label: "Plan Active", done: sub?.status === "active" || isTrialing, href: "/billing" },
  ];
  const setupDone = setupSteps.filter((s) => s.done).length;
  const setupPercent = Math.round((setupDone / setupSteps.length) * 100);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back, {data.user.name?.split(" ")[0]} 👋</h1>
          <p className="text-sm text-text-muted mt-0.5">{data.business?.name || "Your Business"} • <span className="capitalize">{sub?.plan || "Trial"}</span></p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${data.business?.whatsapp_connected ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-text-muted border border-border"}`}>
            <span className={`w-2 h-2 rounded-full ${data.business?.whatsapp_connected ? "bg-emerald-500 animate-pulse" : "bg-gray-400"}`} />
            {data.business?.whatsapp_connected ? "WhatsApp Live" : "WhatsApp Off"}
          </div>
          {isTrialing && <Badge variant="warning">{daysLeft}d trial left</Badge>}
        </div>
      </div>

      {/* Trial Banner (compact) */}
      {isTrialing && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-100">
          <div className="flex items-center gap-3">
            <Zap className="w-5 h-5 text-indigo-600" />
            <div>
              <p className="text-sm font-semibold text-indigo-900">7-Day Free Trial • {daysLeft} days remaining</p>
              <p className="text-xs text-indigo-600">{messagesUsed}/{messageLimit} messages used</p>
            </div>
          </div>
          <a href="/billing"><Button size="sm">Upgrade</Button></a>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <KPICard icon={MessageSquare} label="Conversations" value={data.stats.conversations} color="indigo" />
        <KPICard icon={Users} label="Leads" value={data.stats.leads} color="blue" />
        <KPICard icon={DollarSign} label="Revenue" value={0} prefix="$" color="emerald" />
        <KPICard icon={Calendar} label="Appointments" value={data.stats.appointments} color="purple" />
        <KPICard icon={Megaphone} label="Messages" value={data.stats.messages} color="amber" />
        <KPICard icon={Target} label="Conversion" value={data.stats.leads > 0 ? Math.round((data.stats.appointments / data.stats.leads) * 100) : 0} suffix="%" color="rose" />
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* WhatsApp + Message Usage */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">WhatsApp Status</h3>
                <span className={`w-2.5 h-2.5 rounded-full ${data.business?.whatsapp_connected ? "bg-emerald-500" : "bg-gray-300"}`} />
              </div>
              {data.business?.whatsapp_connected ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-text-muted">Status</span><span className="text-emerald-600 font-medium">Active</span></div>
                  <div className="flex justify-between text-xs"><span className="text-text-muted">AI Auto-Reply</span><span className="font-medium">Enabled</span></div>
                  <div className="flex justify-between text-xs"><span className="text-text-muted">Messages Today</span><span className="font-medium">{messagesUsed}</span></div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-text-muted mb-2">Connect to start receiving messages</p>
                  <a href="/settings"><Button size="sm" variant="secondary"><Phone className="w-3.5 h-3.5" />Connect</Button></a>
                </div>
              )}
            </Card>
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">Message Usage</h3>
                <span className="text-xs text-text-muted">{msgPercent}%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full mb-2">
                <div className={`h-2 rounded-full transition-all ${msgPercent > 90 ? "bg-red-500" : msgPercent > 70 ? "bg-amber-500" : "bg-indigo-500"}`} style={{ width: `${msgPercent}%` }} />
              </div>
              <div className="flex justify-between text-xs text-text-muted">
                <span>{messagesUsed} used</span>
                <span>{messageLimit} limit</span>
              </div>
              {msgPercent > 80 && <p className="text-xs text-amber-600 mt-2 font-medium">⚠ Running low on messages</p>}
            </Card>
          </div>

          {/* Recent Conversations */}
          <Card padding="none">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-sm font-bold">Recent Conversations</h3>
              <a href="/conversations" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></a>
            </div>
            {data.recentConversations.length === 0 ? (
              <div className="p-8 text-center">
                <MessageSquare className="w-10 h-10 text-text-muted/15 mx-auto mb-3" />
                <p className="text-sm font-medium text-text-primary mb-1">No conversations yet</p>
                <p className="text-xs text-text-muted mb-3">Connect WhatsApp to start capturing leads</p>
                <a href="/settings"><Button size="sm" variant="secondary"><Settings className="w-3.5 h-3.5" />Connect WhatsApp</Button></a>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentConversations.slice(0, 5).map((c) => (
                  <a key={c.id} href="/conversations" className="flex items-center gap-3 p-3 hover:bg-gray-50/50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center text-xs font-bold text-indigo-600">{(c.leads?.name || "?")[0].toUpperCase()}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.leads?.name || c.leads?.phone || "Unknown"}</p>
                      <p className="text-xs text-text-muted truncate">{c.last_message_text || "No messages"}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-text-muted">{c.last_message_at ? timeAgo(c.last_message_at) : ""}</p>
                      {c.channel === "instagram" && <Badge variant="default">IG</Badge>}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-6">
          {/* Setup Progress */}
          {setupDone < setupSteps.length && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold">Setup Progress</h3>
                <span className="text-xs font-bold text-indigo-600">{setupPercent}%</span>
              </div>
              {/* Circular Progress */}
              <div className="flex items-center gap-4 mb-4">
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#f3f4f6" strokeWidth="5" />
                    <circle cx="28" cy="28" r="24" fill="none" stroke="#6366f1" strokeWidth="5" strokeDasharray={`${(setupPercent / 100) * 151} 151`} strokeLinecap="round" />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{setupDone}/{setupSteps.length}</span>
                </div>
                <div className="space-y-1.5 flex-1">
                  {setupSteps.map((step) => (
                    <a key={step.label} href={step.href} className="flex items-center gap-2 group">
                      {step.done ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <Circle className="w-3.5 h-3.5 text-gray-300" />}
                      <span className={`text-xs ${step.done ? "text-text-primary" : "text-text-muted group-hover:text-primary"}`}>{step.label}</span>
                    </a>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {/* AI Performance */}
          <Card>
            <div className="flex items-center gap-2 mb-3">
              <Bot className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold">AI Performance</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-muted">Messages Handled</span>
                <span className="text-sm font-bold">{data.stats.messages}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-muted">Leads Captured</span>
                <span className="text-sm font-bold">{data.stats.leads}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-muted">Appointments Booked</span>
                <span className="text-sm font-bold">{data.stats.appointments}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-text-muted">Response Rate</span>
                <span className="text-sm font-bold text-emerald-600">{data.stats.messages > 0 ? "100%" : "—"}</span>
              </div>
            </div>
            <a href="/analytics" className="block mt-3 text-xs text-primary font-medium hover:underline">View full analytics →</a>
          </Card>

          {/* Quick Actions */}
          <Card>
            <h3 className="text-sm font-bold mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2">
              <a href="/knowledge" className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-xs font-medium text-text-secondary">
                <Bot className="w-3.5 h-3.5" />Train AI
              </a>
              <a href="/broadcasts" className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-xs font-medium text-text-secondary">
                <Megaphone className="w-3.5 h-3.5" />Broadcast
              </a>
              <a href="/leads" className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-xs font-medium text-text-secondary">
                <Users className="w-3.5 h-3.5" />View Leads
              </a>
              <a href="/simulator" className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 hover:bg-indigo-50 hover:text-indigo-700 transition-colors text-xs font-medium text-text-secondary">
                <Zap className="w-3.5 h-3.5" />Test AI
              </a>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, prefix, suffix, color }: {
  icon: typeof Users; label: string; value: number; prefix?: string; suffix?: string; color: string;
}) {
  const colors: Record<string, { bg: string; text: string; icon: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-700", icon: "text-indigo-500" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-500" },
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-500" },
    purple: { bg: "bg-purple-50", text: "text-purple-700", icon: "text-purple-500" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-500" },
    rose: { bg: "bg-rose-50", text: "text-rose-700", icon: "text-rose-500" },
  };
  const c = colors[color] || colors.indigo;

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute top-0 right-0 w-16 h-16 ${c.bg} rounded-bl-[2rem] opacity-60`} />
      <div className="relative">
        <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
          <Icon className={`w-4 h-4 ${c.icon}`} />
        </div>
        <p className={`text-2xl font-bold ${c.text}`}>{prefix || ""}{value.toLocaleString()}{suffix || ""}</p>
        <p className="text-xs text-text-muted mt-0.5">{label}</p>
      </div>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 bg-gray-100 rounded-lg w-64" />
      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => <div key={i} className="h-28 bg-gray-100 rounded-xl" />)}
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-40 bg-gray-100 rounded-xl" />
          <div className="h-64 bg-gray-100 rounded-xl" />
        </div>
        <div className="space-y-6">
          <div className="h-48 bg-gray-100 rounded-xl" />
          <div className="h-48 bg-gray-100 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}
