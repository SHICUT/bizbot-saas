"use client";

import { useEffect, useState } from "react";
import { Users, MessageSquare, Bot, Calendar, ArrowRight, Loader2 } from "lucide-react";
import StatsCard from "@/components/dashboard/StatsCard";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/layout/PageHeader";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";

interface DashboardData {
  user: { id: string; email: string; name: string };
  business: { name: string; plan: string; whatsapp_connected: boolean } | null;
  stats: { leads: number; messages: number; conversations: number; appointments: number; messagesUsed: number; messageLimit: number };
  recentConversations: Array<{ id: string; last_message_text: string; last_message_at: string; unread_count: number; channel: string; leads: { name: string; phone: string } }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!data || (data as unknown as { error?: string }).error) {
    return (
      <div className="text-center py-16">
        <p className="text-text-muted">Failed to load dashboard. Please refresh.</p>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Welcome, ${data.user.name}`}
        description={data.business ? `${data.business.name} — ${data.business.plan} plan` : "Set up your business to get started"}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Leads" value={String(data.stats.leads)} icon={Users} iconColor="bg-indigo-50 text-indigo-600" />
        <StatsCard title="Messages" value={String(data.stats.messages)} change={`${data.stats.messagesUsed}/${data.stats.messageLimit} used`} changeType="neutral" icon={MessageSquare} iconColor="bg-emerald-50 text-emerald-600" />
        <StatsCard title="Active Chats" value={String(data.stats.conversations)} icon={Bot} iconColor="bg-purple-50 text-purple-600" />
        <StatsCard title="Appointments" value={String(data.stats.appointments)} icon={Calendar} iconColor="bg-amber-50 text-amber-600" />
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Conversations */}
        <Card padding="none" className="lg:col-span-2">
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-base font-semibold text-text-primary">Recent Conversations</h2>
            <a href="/conversations" className="text-sm text-primary font-medium hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
          {data.recentConversations.length === 0 ? (
            <div className="p-8 text-center">
              <MessageSquare className="w-10 h-10 text-text-muted/30 mx-auto mb-3" />
              <p className="text-sm text-text-muted">No conversations yet</p>
              <p className="text-xs text-text-muted mt-1">Messages will appear here once customers contact you</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {data.recentConversations.map((conv) => (
                <div key={conv.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors">
                  <Avatar name={conv.leads?.name || "Unknown"} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-text-primary truncate">{conv.leads?.name || conv.leads?.phone || "Unknown"}</p>
                      <span className="text-xs text-text-muted">{conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString() : ""}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-text-secondary truncate">{conv.last_message_text || "No messages"}</p>
                      <div className="flex items-center gap-1">
                        {conv.channel === "instagram" && <Badge variant="default">IG</Badge>}
                        {conv.unread_count > 0 && <span className="w-5 h-5 rounded-full bg-primary text-white text-xs flex items-center justify-center">{conv.unread_count}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Quick Info */}
        <Card>
          <h2 className="text-base font-semibold text-text-primary mb-4">Quick Setup</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">WhatsApp</span>
              <Badge variant={data.business?.whatsapp_connected ? "success" : "warning"}>
                {data.business?.whatsapp_connected ? "Connected" : "Not connected"}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">AI Auto-Reply</span>
              <Badge variant="success">Active</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-secondary">Plan</span>
              <span className="text-sm font-medium text-text-primary capitalize">{data.business?.plan || "Trial"}</span>
            </div>
            <hr className="border-border" />
            <a href="/automations" className="text-sm text-primary font-medium hover:underline block">Configure AI settings →</a>
            <a href="/settings" className="text-sm text-primary font-medium hover:underline block">Complete business profile →</a>
          </div>
        </Card>
      </div>
    </div>
  );
}
