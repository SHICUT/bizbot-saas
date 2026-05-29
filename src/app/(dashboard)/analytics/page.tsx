"use client";

import { useEffect, useState } from "react";
import { TrendingUp, Users, MessageSquare, Clock, Loader2, BarChart2 } from "lucide-react";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/layout/PageHeader";
import StatsCard from "@/components/dashboard/StatsCard";

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ leads: 0, messages: 0, conversations: 0, appointments: 0 });

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((data) => { if (data.stats) setStats(data.stats); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const hasData = stats.messages > 0 || stats.leads > 0;

  return (
    <div>
      <PageHeader title="Analytics" description="Track your WhatsApp automation performance" />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard title="Total Messages" value={String(stats.messages)} icon={MessageSquare} iconColor="bg-indigo-50 text-indigo-600" />
        <StatsCard title="Total Leads" value={String(stats.leads)} icon={Users} iconColor="bg-emerald-50 text-emerald-600" />
        <StatsCard title="Active Chats" value={String(stats.conversations)} icon={Clock} iconColor="bg-purple-50 text-purple-600" />
        <StatsCard title="Appointments" value={String(stats.appointments)} icon={TrendingUp} iconColor="bg-amber-50 text-amber-600" />
      </div>

      {!hasData ? (
        <Card>
          <div className="py-16 text-center">
            <BarChart2 className="w-12 h-12 text-text-muted/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-text-primary mb-1">No analytics available</h3>
            <p className="text-sm text-text-muted max-w-sm mx-auto">
              Analytics will populate automatically as customers message you and leads are captured.
              Connect WhatsApp to start receiving data.
            </p>
          </div>
        </Card>
      ) : (
        <Card>
          <h3 className="text-base font-semibold text-text-primary mb-4">Performance Summary</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">Total messages processed</span><span className="text-sm font-semibold">{stats.messages}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">Leads captured</span><span className="text-sm font-semibold">{stats.leads}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">Active conversations</span><span className="text-sm font-semibold">{stats.conversations}</span></div>
            <div className="flex items-center justify-between"><span className="text-sm text-text-secondary">Appointments booked</span><span className="text-sm font-semibold">{stats.appointments}</span></div>
          </div>
        </Card>
      )}
    </div>
  );
}
