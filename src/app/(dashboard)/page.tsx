"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, MessageSquare, Bot, Calendar, Zap, ArrowRight, Loader2, CheckCircle, Circle, MessageCircle, Settings } from "lucide-react";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";

interface DashboardData {
  user: { name: string; email: string };
  business: { name: string; plan: string; whatsapp_connected: boolean; type: string; onboarding_completed: boolean; business_context: string } | null;
  subscription: { plan: string; status: string; trial_end: string | null; messages_used: number; message_limit: number; current_period_end: string | null } | null;
  stats: { leads: number; messages: number; conversations: number; appointments: number };
  recentConversations: Array<{ id: string; last_message_text: string; last_message_at: string; channel: string; leads: { name: string } }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then((r) => r.json()).then((d) => { setData(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (!data) return <div className="text-center py-16 text-text-muted">Failed to load. Please refresh.</div>;

  const sub = data.subscription;
  const now = new Date();
  const trialEnd = sub?.trial_end ? new Date(sub.trial_end) : null;
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (86400000))) : 0;
  const isTrialing = sub?.status === "trialing";
  const messagesUsed = sub?.messages_used || 0;
  const messageLimit = sub?.message_limit || 100;
  const messagePercent = Math.min(100, Math.round((messagesUsed / messageLimit) * 100));
  const daysPercent = isTrialing ? Math.round(((7 - daysLeft) / 7) * 100) : 0;

  // Setup progress
  const setupSteps = [
    { label: "Business Profile", done: !!data.business?.name },
    { label: "Knowledge Base", done: !!data.business?.business_context },
    { label: "AI Configured", done: !!data.business?.type && data.business.type !== "other" },
    { label: "WhatsApp Connected", done: !!data.business?.whatsapp_connected },
    { label: "Plan Selected", done: sub?.status === "active" || isTrialing },
  ];
  const setupDone = setupSteps.filter((s) => s.done).length;

  return (
    <div>
      {/* Welcome Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">Welcome, {data.user.name} 👋</h1>
        <p className="text-sm text-text-secondary mt-1">
          {data.business?.name || "Your Business"} • <span className="capitalize">{sub?.plan || "Trial"} Plan</span>
          {isTrialing && <span className="text-amber-600 ml-2">• Trial ends in {daysLeft} days</span>}
        </p>
      </motion.div>

      {/* Trial Banner */}
      {isTrialing && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 p-5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-amber-900">7-Day Free Trial</h3>
                <Badge variant="warning">{daysLeft} days left</Badge>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-amber-700">Messages</span><span className="font-semibold text-amber-900">{messagesUsed}/{messageLimit}</span></div>
                  <div className="h-2 bg-amber-100 rounded-full overflow-hidden"><motion.div className="h-full bg-amber-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${messagePercent}%` }} transition={{ duration: 0.8 }} /></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1"><span className="text-amber-700">Days Used</span><span className="font-semibold text-amber-900">{7 - daysLeft}/7</span></div>
                  <div className="h-2 bg-amber-100 rounded-full overflow-hidden"><motion.div className="h-full bg-orange-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${daysPercent}%` }} transition={{ duration: 0.8 }} /></div>
                </div>
              </div>
            </div>
            <a href="/billing">
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="px-6 py-3 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white font-semibold text-sm shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-shadow flex items-center gap-2">
                <Zap className="w-4 h-4" /> Upgrade Now
              </motion.button>
            </a>
          </div>
        </motion.div>
      )}

      {/* KPI Cards */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard icon={Users} label="Total Leads" value={data.stats.leads} color="indigo" />
        <KPICard icon={MessageSquare} label="Messages" value={data.stats.messages} sub={`${messagesUsed}/${messageLimit} used`} color="emerald" />
        <KPICard icon={Bot} label="Active Chats" value={data.stats.conversations} color="purple" />
        <KPICard icon={Calendar} label="Appointments" value={data.stats.appointments} color="amber" />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Conversations */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2">
          <Card padding="none">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-sm font-bold text-text-primary">Recent Conversations</h2>
              <a href="/conversations" className="text-xs text-primary font-medium hover:underline flex items-center gap-1">View all <ArrowRight className="w-3 h-3" /></a>
            </div>
            {data.recentConversations.length === 0 ? (
              <div className="p-10 text-center">
                <MessageCircle className="w-10 h-10 text-text-muted/20 mx-auto mb-3" />
                <p className="text-sm font-medium text-text-primary mb-1">No conversations yet</p>
                <p className="text-xs text-text-muted mb-4">Connect WhatsApp and start capturing leads instantly.</p>
                <a href="/settings" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary-hover transition-colors">
                  <Settings className="w-3.5 h-3.5" /> Connect WhatsApp
                </a>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {data.recentConversations.slice(0, 5).map((c) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">{(c.leads?.name || "?")[0]}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.leads?.name || "Unknown"}</p>
                      <p className="text-xs text-text-muted truncate">{c.last_message_text || "No messages"}</p>
                    </div>
                    {c.channel === "instagram" && <Badge variant="default">IG</Badge>}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </motion.div>

        {/* Right Column */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-4">
          {/* Setup Progress */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-text-primary">Setup Progress</h3>
              <span className="text-xs font-semibold text-primary">{setupDone}/{setupSteps.length}</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
              <motion.div className="h-full bg-primary rounded-full" initial={{ width: 0 }} animate={{ width: `${(setupDone / setupSteps.length) * 100}%` }} transition={{ duration: 0.6 }} />
            </div>
            <div className="space-y-2">
              {setupSteps.map((step) => (
                <div key={step.label} className="flex items-center gap-2.5">
                  {step.done ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Circle className="w-4 h-4 text-gray-300" />}
                  <span className={`text-xs ${step.done ? "text-text-primary" : "text-text-muted"}`}>{step.label}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Trial Limits */}
          {isTrialing && (
            <Card>
              <h3 className="text-sm font-bold text-text-primary mb-3">Trial Includes</h3>
              <div className="space-y-2 text-xs">
                {["100 Messages", "1 AI Chatbot", "Basic Dashboard", "Lead Capture"].map((f) => (
                  <div key={f} className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-emerald-500" /><span className="text-text-secondary">{f}</span></div>
                ))}
                {["WhatsApp Integration", "Campaigns", "Team Members", "Advanced AI"].map((f) => (
                  <div key={f} className="flex items-center gap-2"><Circle className="w-3.5 h-3.5 text-gray-300" /><span className="text-text-muted line-through">{f}</span></div>
                ))}
              </div>
              <a href="/billing" className="block mt-4 text-xs text-primary font-medium hover:underline">Unlock all features →</a>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color }: { icon: typeof Users; label: string; value: number; sub?: string; color: string }) {
  const colors: Record<string, string> = { indigo: "bg-indigo-50 text-indigo-600", emerald: "bg-emerald-50 text-emerald-600", purple: "bg-purple-50 text-purple-600", amber: "bg-amber-50 text-amber-600" };
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-text-muted font-medium">{label}</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{value}</p>
          {sub && <p className="text-[10px] text-text-muted mt-0.5">{sub}</p>}
        </div>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}><Icon className="w-4.5 h-4.5" /></div>
      </div>
    </Card>
  );
}
